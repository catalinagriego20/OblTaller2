// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/MathUtils.sol";

interface IMintableERC20 {
    function mint(address to, uint256 amount) external;
    function decimals() external view returns (uint8);
}

interface IStakingView {
    enum Bucket { Vote, Proposal }
    function stakeOf(address user, Bucket bucket) external view returns (uint256);
}

contract DAO is Ownable {
    using MathUtils for uint256;

    enum ProposalStatus { ACTIVE, ACCEPTED, REJECTED }

    struct Proposal {
        uint256 id;
        string title;
        string description;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 startTime;
        ProposalStatus status;
        mapping(address => bool) voted;
        address[] voters;
        mapping(address => bool) voteChoice;
    }

    // -------- Contratos externos --------
    IMintableERC20 public token;
    uint8 public tokenDecimals;      // cacheo de decimals para evitar llamadas externas en checks
    address public staking; // IStakingView compatible

    // -------- Seguridad / operación --------
    address public panicWallet;
    bool public isPanicked;

    // -------- Parámetros DAO --------
    uint256 public priceWeiPerToken;      // precio en wei por token (18 dec)
    uint256 public minStakeForVote;       // tokens mínimos en bucket Vote
    uint256 public minStakeForProposal;   // tokens mínimos en bucket Proposal
    uint256 public votingPeriod;          // en segundos
    uint256 public tokensPerVotingPower;  // cuántos tokens == 1 VP (modo lineal)
    uint256 public lockTimeSeconds;       // tiempo de lock leído por Staking vía IDAO.lockTime()

    bool public quadraticVotingEnabled;   // Conjunto A toggle

    // (opcional) métricas internas que pueden servir como efectos antes de interacciones
    uint256 public totalWeiReceived;
    uint256 public totalTokensMinted;

    // -------- Propuestas --------
    uint256 public proposalCount;
    mapping(uint256 => Proposal) private _proposals;

    // -------- Eventos --------
    event PanicSet(address indexed wallet);
    event PanicTriggered(address indexed by);
    event TranquilidadRestored(address indexed by);

    event ParamsUpdated(
        uint256 priceWeiPerToken,
        uint256 minStakeVote,
        uint256 minStakeProposal,
        uint256 votingPeriod,
        uint256 tokensPerVP,
        uint256 lockTimeSeconds
    );
    event QuadraticVotingToggled(bool enabled);

    event StakingChanged(address indexed oldStaking, address indexed newStaking);
    event TokenChanged(address indexed oldToken, address indexed newToken);

    event TokensPurchased(address indexed buyer, uint256 weiPaid, uint256 tokensMinted);

    event ProposalCreated(uint256 indexed id, address indexed creator, string title);
    event Voted(uint256 indexed id, address indexed voter, bool inFavor, uint256 power);
    event ProposalFinalized(uint256 indexed id, ProposalStatus status);

    // -------- Modifiers --------
    modifier notPanicked() {
        require(!isPanicked, "DAO: panic");
        _;
    }

    modifier panicConfigured() {
        require(panicWallet != address(0), "DAO: panic wallet not set");
        _;
    }

    modifier onlyStakingSet() {
        require(staking != address(0), "DAO: staking not set");
        _;
    }

    // -------- Constructor --------
    constructor(
        address _token,
        address _staking,           // puede venir en cero y setearse luego
        address _multisigOwner,
        uint256 _priceWeiPerToken,
        uint256 _minStakeVote,
        uint256 _minStakeProposal,
        uint256 _votingPeriodSeconds,
        uint256 _tokensPerVotingPower,
        uint256 _lockTimeSeconds
    ) {
        require(_token != address(0), "DAO: token zero");
        require(_multisigOwner != address(0), "DAO: owner zero");
        require(_priceWeiPerToken > 0, "DAO: invalid price");
        require(_tokensPerVotingPower > 0, "DAO: invalid tokensPerVP");

        token = IMintableERC20(_token);
        // cacheo decimals en constructor (llamada externa permitida aquí)
        tokenDecimals = token.decimals();

        staking = _staking;

        _transferOwnership(_multisigOwner);

        priceWeiPerToken     = _priceWeiPerToken;
        minStakeForVote      = _minStakeVote;
        minStakeForProposal  = _minStakeProposal;
        votingPeriod         = _votingPeriodSeconds;
        tokensPerVotingPower = _tokensPerVotingPower;
        lockTimeSeconds      = _lockTimeSeconds;
    }

    // =========================================================
    //                  ADMIN (solo multisig owner)
    // =========================================================

    function setPanicWallet(address _wallet) external onlyOwner {
        panicWallet = _wallet;
        emit PanicSet(_wallet);
    }

    function setParams(
        uint256 _priceWeiPerToken,
        uint256 _minStakeVote,
        uint256 _minStakeProposal,
        uint256 _votingPeriodSeconds,
        uint256 _tokensPerVotingPower,
        uint256 _lockTimeSeconds
    ) external onlyOwner {
        require(_priceWeiPerToken > 0, "DAO: invalid price");
        require(_tokensPerVotingPower > 0, "DAO: invalid tokensPerVP");

        priceWeiPerToken     = _priceWeiPerToken;
        minStakeForVote      = _minStakeVote;
        minStakeForProposal  = _minStakeProposal;
        votingPeriod         = _votingPeriodSeconds;
        tokensPerVotingPower = _tokensPerVotingPower;
        lockTimeSeconds      = _lockTimeSeconds;

        emit ParamsUpdated(
            _priceWeiPerToken,
            _minStakeVote,
            _minStakeProposal,
            _votingPeriodSeconds,
            _tokensPerVotingPower,
            _lockTimeSeconds
        );
    }

    function toggleQuadraticVoting(bool enable) external onlyOwner {
        quadraticVotingEnabled = enable;
        emit QuadraticVotingToggled(enable);
    }

    function setStaking(address newStaking) external onlyOwner {
        require(newStaking != address(0), "DAO: zero staking");
        address old = staking;
        staking = newStaking;
        emit StakingChanged(old, newStaking);
    }

    function setToken(address newToken) external onlyOwner {
        require(newToken != address(0), "DAO: zero token");
        address old = address(token);
        token = IMintableERC20(newToken);
        // actualizo cache de decimals; llamada externa permitida en admin function
        tokenDecimals = token.decimals();
        emit TokenChanged(old, newToken);
    }

    // =========================================================
    //                  PANICO / TRANQUILIDAD
    // =========================================================

    function panico() external panicConfigured {
        require(msg.sender == panicWallet, "DAO: only panic wallet");
        isPanicked = true;
        emit PanicTriggered(msg.sender);
    }

    function tranquilidad() external panicConfigured {
        require(msg.sender == panicWallet, "DAO: only panic wallet");
        isPanicked = false;
        emit TranquilidadRestored(msg.sender);
    }

    // =========================================================
    //                  COMPRA DE TOKENS
    // =========================================================

    receive() external payable {
        _buyTokens(msg.sender, msg.value);
    }

    // ya no usamos nonReentrant; seguimos CHECKS-EFFECTS-INTERACTIONS en _buyTokens
    function buyTokens() external payable notPanicked panicConfigured {
        _buyTokens(msg.sender, msg.value);
    }

    /**
     * @dev CHECKS -> EFFECTS -> INTERACTIONS
     * - Checks: validaciones iniciales (weiAmount, price).
     * - Effects: computos internos y actualización de métricas internas y emisión de evento.
     * - Interactions: llamada externa a token.mint() (último paso).
     */
    function _buyTokens(address buyer, uint256 weiAmount) internal {
        // --- CHECKS ---
        require(weiAmount > 0, "DAO: no ETH");
        require(priceWeiPerToken > 0, "DAO: price not set");

        // uso tokenDecimals cacheado (evita llamadas externas en esta fase)
        uint8 dec = tokenDecimals;
        uint256 tokensOut = (weiAmount * (10 ** uint256(dec))) / priceWeiPerToken;
        require(tokensOut > 0, "DAO: too little ETH");

        // --- EFFECTS ---
        // actualizo métricas internas antes de la interacción externa
        totalWeiReceived += weiAmount;
        totalTokensMinted += tokensOut;

        // emito el evento como efecto; si el mint revierte, todo se revierte y el evento no queda
        emit TokensPurchased(buyer, weiAmount, tokensOut);

        // --- INTERACTION (último paso) ---
        token.mint(buyer, tokensOut);
    }

    // =========================================================
    //                  PROPUESTAS / VOTACION
    // =========================================================

    function createProposal(string memory title, string memory description)
        external
        notPanicked
        panicConfigured
        onlyStakingSet
    {
        // CHECK: lectura externa de staking para validar (solo lectura)
        uint256 st = IStakingView(staking).stakeOf(msg.sender, IStakingView.Bucket.Proposal);
        require(st >= minStakeForProposal, "DAO: insufficient proposal stake");

        // EFFECTS: cambios de estado locales
        uint256 id = ++proposalCount;
        Proposal storage p = _proposals[id];
        p.id = id;
        p.creator = msg.sender;
        p.title = title;
        p.description = description;
        p.startTime = block.timestamp;
        p.status = ProposalStatus.ACTIVE;

        emit ProposalCreated(id, msg.sender, title);
    }

    function _isActive(uint256 id) internal view returns (bool) {
        Proposal storage p = _proposals[id];
        if (p.status != ProposalStatus.ACTIVE) return false;
        if (block.timestamp > p.startTime + votingPeriod) return false;
        return true;
    }

    function vote(uint256 id, bool inFavor)
        external
        notPanicked
        panicConfigured
        onlyStakingSet
    {
        Proposal storage p = _proposals[id];
        require(p.id != 0, "DAO: invalid proposal");
        require(_isActive(id), "DAO: not active");
        require(!p.voted[msg.sender], "DAO: already voted");

        // CHECK: lectura externa de staking para validar stake de voto
        uint256 st = IStakingView(staking).stakeOf(msg.sender, IStakingView.Bucket.Vote);
        require(st >= minStakeForVote, "DAO: insufficient vote stake");

        // EFFECTS: calculo y modificación de estado interno
        uint256 vp;
        if (quadraticVotingEnabled) {
            uint256 base = st / tokensPerVotingPower;
            vp = base.isqrt();
        } else {
            vp = st / tokensPerVotingPower;
        }
        require(vp > 0, "DAO: zero voting power");

        p.voted[msg.sender] = true;
        p.voteChoice[msg.sender] = inFavor;
        p.voters.push(msg.sender);

        if (inFavor) p.votesFor += vp;
        else p.votesAgainst += vp;

        emit Voted(id, msg.sender, inFavor, vp);
        // no hay interactions externas en esta función -> CEI respetado
    }

    function finalize(uint256 id) external notPanicked panicConfigured {
        Proposal storage p = _proposals[id];
        require(p.id != 0, "DAO: invalid proposal");
        require(p.status == ProposalStatus.ACTIVE, "DAO: not active");
        require(block.timestamp > p.startTime + votingPeriod, "DAO: voting period not ended");

        // EFFECTS: determinación del resultado y cambio de estado
        if (p.votesFor > p.votesAgainst) {
            p.status = ProposalStatus.ACCEPTED;
        } else if (p.votesAgainst > p.votesFor) {
            p.status = ProposalStatus.REJECTED;
        } else {
            p.status = ProposalStatus.EXPIRED; // empate
        }

        emit ProposalFinalized(id, p.status);
    }

    // =========================================================
    //                  GETTERS PARA UI
    // =========================================================

    function getProposal(uint256 id)
        external
        view
        returns (
            uint256 proposalId,
            address creator,
            string memory title,
            string memory description,
            uint256 votesFor,
            uint256 votesAgainst,
            uint256 startTime,
            ProposalStatus status
        )
    {
        Proposal storage p = _proposals[id];
        require(p.id != 0, "DAO: invalid proposal");
        return (p.id, p.creator, p.title, p.description, p.votesFor, p.votesAgainst, p.startTime, p.status);
    }

    function getProposalVoters(uint256 id)
        external
        view
        returns (address[] memory voters, bool[] memory inFavor)
    {
        Proposal storage p = _proposals[id];
        require(p.id != 0, "DAO: invalid proposal");
        uint256 n = p.voters.length;
        voters = new address[](n);
        inFavor = new bool[](n);
        for (uint256 i = 0; i < n; i++) {
            address v = p.voters[i];
            voters[i] = v;
            inFavor[i] = p.voteChoice[v];
        }
    }

    function proposalsByStatus(ProposalStatus status_, uint256 fromId, uint256 toId)
        external
        view
        returns (uint256[] memory)
    {
        if (toId == 0 || toId > proposalCount) toId = proposalCount;
        require(fromId >= 1 && fromId <= toId, "DAO: invalid range");

        uint256 count;
        for (uint256 i = fromId; i <= toId; i++) {
            Proposal storage p = _proposals[i];
            if (p.id != 0 && p.status == status_) count++;
        }

        uint256[] memory ids = new uint256[](count);
        uint256 k;
        for (uint256 i = fromId; i <= toId; i++) {
            Proposal storage p = _proposals[i];
            if (p.id != 0 && p.status == status_) {
                ids[k++] = i;
            }
        }
        return ids;
    }

    // =========================================================
    //          IDAO (usado por Staking para lockTime)
    // =========================================================

    // si creás un Staking que llame a DAO.lockTime() éste debe implementar la interfaz;
    // acá devolvemos el lockTimeSeconds
    function lockTime() external view returns (uint256) {
        return lockTimeSeconds;
    }
}
