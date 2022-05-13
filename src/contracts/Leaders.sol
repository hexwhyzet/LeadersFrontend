// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./ERC2981/ERC2981Base.sol";
import "./ERC2981/ERC2981ContractWideRoyalties.sol";

contract Leaders is ERC721, ERC721Enumerable, Ownable, ERC2981ContractWideRoyalties {
    using Counters for Counters.Counter;
    using SafeMath for uint256;
    Counters.Counter private _lastTokenId;

    constructor() ERC721("0xLeaders", "0XLEADERS") {}

    enum Status{IDLE, WHITELIST, PUBLIC}
    Status public contractStatus;
    uint256 public tokenPrice = 7000000000000000000;
    uint256 public whitelistTokenPrice = 3500000000000000000;
    uint256 public mintAtOnceLimit = 30;
    uint256 public maxSupply = 2189;
    bool public lockedMaxSupply = false;
    string public baseURI = "https://resources.0xleaders.com/";
    bool public lockedBaseURI = false;
    mapping(address => uint256) public whitelist;

    function leftToMint() public view returns (uint256) {
        return maxSupply - _lastTokenId.current();
    }

    modifier amountToMintChecker(uint256 amountToMint) {
        require(amountToMint > 0, "Can't mint 0 tokens");
        require(amountToMint <= mintAtOnceLimit, "Can't mint this amount at once");
        require(amountToMint <= leftToMint(), "Fewer tokens left than requested");
        _;
    }

    function getWhitelistQuota(address to) public view returns (uint256) {
        return whitelist[to];
    }

    function addWhitelistQuota(address to, uint256 amount) public onlyOwner {
        whitelist[to] += amount;
    }

    function whitelistMint(uint256 amountToMint) public payable amountToMintChecker(amountToMint) {
        require(contractStatus == Status.WHITELIST, "Whitelist sale is currently closed");
        require(amountToMint <= getWhitelistQuota(msg.sender), "Whitelist quota is less than requested");
        require(msg.value == whitelistTokenPrice.mul(amountToMint), "Incorrect price");
        _safeMintAmount(msg.sender, amountToMint);
        whitelist[msg.sender] -= amountToMint;
    }

    function publicMint(uint256 amountToMint) public payable amountToMintChecker(amountToMint) {
        require(contractStatus == Status.PUBLIC, "Public sale is currently closed");
        require(msg.value == tokenPrice.mul(amountToMint), "Incorrect price");
        _safeMintAmount(msg.sender, amountToMint);
    }

    function devMint(address to, uint256 amountToMint) public onlyOwner amountToMintChecker(amountToMint) {
        _safeMintAmount(to, amountToMint);
    }

    function _safeMintAmount(address to, uint256 amountToMint) internal {
        for (uint256 i = 0; i < amountToMint; i++) {
            _safeMint(to, _lastTokenId.current() + 1);
            _lastTokenId.increment();
        }
    }

    function changeContractStatus(uint256 newContractStatus) public onlyOwner {
        require(newContractStatus <= 2, "Unsupported status");
        require(uint256(contractStatus) != newContractStatus, "New contract status equals to current one");
        contractStatus = Status(newContractStatus);
    }

    function getContractStatus() public view returns (uint256) {
        return uint256(contractStatus);
    }

    function changeWhitelistTokenPrice(uint256 newWhitelistTokenPrice) public onlyOwner {
        whitelistTokenPrice = newWhitelistTokenPrice;
    }

    function changeTokenPrice(uint256 newTokenPrice) public onlyOwner {
        tokenPrice = newTokenPrice;
    }

    function changeMintAtOnceLimit(uint256 newMintAtOnceLimit) public onlyOwner {
        mintAtOnceLimit = newMintAtOnceLimit;
    }

    function changeMaxSupply(uint256 newMaxSupply) public onlyOwner {
        require(!lockedMaxSupply, "Max supply is locked");
        maxSupply = newMaxSupply;
    }

    function lockMaxSupply() public onlyOwner {
        require(!lockedMaxSupply, "Max supply is already locked");
        lockedMaxSupply = true;
    }

    function setBaseURI(string memory newBaseURI) public onlyOwner {
        require(!lockedBaseURI, "Base URI is locked");
        baseURI = newBaseURI;
    }

    function lockBaseURI() public onlyOwner {
        require(!lockedBaseURI, "Base URI is already locked");
        lockedBaseURI = true;
    }

    function _baseURI() internal override view returns (string memory) {
        return baseURI;
    }

    function withdrawFunds() public onlyOwner {
        payable(msg.sender).transfer(address(this).balance);
    }

    function setRoyalties(address recipient, uint256 value) public onlyOwner {
        _setRoyalties(recipient, value);
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721Enumerable, ERC2981Base) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}