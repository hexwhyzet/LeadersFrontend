const Leaders = artifacts.require('./Leaders.sol')

// const {expect} = require('chai')
//     .use(require('chai-as-promised'))
//     .should()

let expect = require('chai').expect;

const truffleAssert = require('truffle-assertions');

contract('Leaders', (accounts) => {
    let contract

    before(async () => {
        contract = await Leaders.deployed()
    })

    describe('deployment', async () => {
        it('deploys successfully', async () => {
            contract = await Leaders.deployed()
            const address = contract.address
            console.log(address)
            assert.notEqual(address, '')
        })

        it('has a name', async () => {
            const name = await contract.name()
            assert.equal(name, '0xLeaders')
        })

        it('has a symbol', async () => {
            const symbol = await contract.symbol()
            assert.equal(symbol, '0XLEADERS')
        })
    })

    describe('status changing', async () => {
        it('has status 0 by default', async () => {
            assert.equal(await contract.getContractStatus(), 0);
        })

        it('can\'t change status to unsupported status', async () => {
            tx = contract.changeContractStatus(3);
            await truffleAssert.reverts(tx, "Unsupported status");

            tx = contract.changeContractStatus(1512123);
            await truffleAssert.reverts(tx, "Unsupported status");

            tx = contract.changeContractStatus(0);
            await truffleAssert.reverts(tx, "New contract status equals to current one");
        })

        it('only owner', async () => {
            tx = contract.changeContractStatus(2, {from: accounts[1]});
            await truffleAssert.reverts(tx, "Ownable: caller is not the owner");
        })

        it('changes status properly', async () => {
            await contract.changeContractStatus(1);
            expect((await contract.contractStatus()).toString()).to.be.equal('1');

            await contract.changeContractStatus(2);
            expect((await contract.contractStatus()).toString()).to.be.equal('2');

            await contract.changeContractStatus(0);
            expect((await contract.contractStatus()).toString()).to.be.equal('0');
        })
    })

    describe('whitelist minting', async () => {
        it('changes status properly', async () => {
            tx = contract.whitelistMint(5, {from: accounts[1]});
            await truffleAssert.reverts(tx, "Whitelist sale is currently closed");
            await contract.changeContractStatus(1);
            tx = contract.whitelistMint(0, {from: accounts[1]});
            await truffleAssert.reverts(tx, "Can't mint 0 tokens");
            tx = contract.whitelistMint(5, {from: accounts[1]});
            await truffleAssert.reverts(tx, "Whitelist quota is less than requested");
            await contract.addWhitelistQuota(accounts[1], 4);
            tx = contract.whitelistMint(5, {from: accounts[1]});
            await truffleAssert.reverts(tx, "Whitelist quota is less than requested");
            await contract.addWhitelistQuota(accounts[1], 1);
            await contract.whitelistMint(5, {from: accounts[1], value: (await contract.whitelistTokenPrice()) * 5});
            tx = contract.whitelistMint(1, {from: accounts[1]});
            await truffleAssert.reverts(tx, "Whitelist quota is less than requested");
            await contract.addWhitelistQuota(accounts[1], 3000);
            tx = contract.whitelistMint(2200, {from: accounts[1]});
            await truffleAssert.reverts(tx, "Can't mint this amount at once");
            assert.equal(await contract.totalSupply(), 5);
        })
    })

    describe('public minting', async () => {
        it('creates a new token', async () => {
            tx = contract.publicMint(5, {from: accounts[2]});
            await truffleAssert.reverts(tx, "Public sale is currently closed");
            await contract.changeContractStatus(2);
            tx = contract.publicMint(0, {from: accounts[1]});
            await truffleAssert.reverts(tx, "Can't mint 0 tokens");
            tx = contract.publicMint(2200, {from: accounts[1]});
            await truffleAssert.reverts(tx, "Can't mint this amount at once");
            await contract.publicMint(30, {from: accounts[1], value: (await contract.tokenPrice()) * 30});
            assert.equal(await contract.totalSupply(), 35);
        })
    })

    describe('change and lock max supply', async() => {
        it('only owner', async () => {
            tx = contract.changeMaxSupply(5, {from: accounts[1]});
            await truffleAssert.reverts(tx, "Ownable: caller is not the owner");

            tx = contract.lockMaxSupply({from: accounts[1]});
            await truffleAssert.reverts(tx, "Ownable: caller is not the owner");
        })

        it('changes max supply', async () => {
            await contract.changeMaxSupply(100);
            assert.equal(await contract.maxSupply(), 100);
        })

        it('locks max supply', async () => {
            assert.equal(await contract.lockedMaxSupply(), false);
            await contract.lockMaxSupply();
            assert.equal(await contract.lockedMaxSupply(), true);
            tx = contract.changeMaxSupply(100);
            await truffleAssert.reverts(tx, "Max supply is locked");
        })
    })

    describe('change and lock base URI', async() => {
        it('only owner', async () => {
            tx = contract.setBaseURI("blablabla", {from: accounts[1]});
            await truffleAssert.reverts(tx, "Ownable: caller is not the owner");

            tx = contract.lockBaseURI({from: accounts[1]});
            await truffleAssert.reverts(tx, "Ownable: caller is not the owner");
        })

        it('changes base URI', async () => {
            await contract.setBaseURI("blablabla");
            assert.equal(await contract.baseURI(), "blablabla");
        })

        it('locks base URI', async () => {
            assert.equal(await contract.lockedBaseURI(), false);
            await contract.lockBaseURI();
            assert.equal(await contract.lockedBaseURI(), true);
            tx = contract.setBaseURI("blablabla2");
            await truffleAssert.reverts(tx, "Base URI is locked");
        })
    })

    // describe('withdraw funds', async () => {
    //     it('withdraw funds', async () => {
    //         await contract.changeContractStatus(2);
    //         await contract.withdrawFunds();
    //         let mintValue = (await contract.tokenPrice()) * 5;
    //         await contract.publicMint(5, {from: accounts[1], value: mintValue});
    //         let a = await web3.eth.getBalance(accounts[0]);
    //         await contract.withdrawFunds();
    //         let b = await web3.eth.getBalance(accounts[0]);
    //         assert.equal(a - b, mintValue)
    //     })
    // })

    describe('royalties', () => {
        let ERC721WithContractWideRoyalties;
        let deployer;
        let randomAccount;
        let royaltiesRecipient;

        const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";

        beforeEach(async () => {
            deployer = accounts[0];
            randomAccount = accounts[1];
            royaltiesRecipient = accounts[2];
        });

        describe('Contract wide Royalties', async () => {
            it('has no royalties if not set', async function () {
                await contract.publicMint(1, {value: await contract.tokenPrice()});

                const info = await contract.royaltyInfo(0, 100);
                assert.equal(info[1].toNumber(), 0);
                assert.equal(info[0], ADDRESS_ZERO);
            });

            it('throws if royalties more than 100%', async function () {
                const tx = contract.setRoyalties(
                    royaltiesRecipient,
                    10001,
                );
                await truffleAssert.reverts(tx, 'ERC2981Royalties: Too high');
            });

            it('has the right royalties for tokenId', async function () {
                await contract.setRoyalties(
                    royaltiesRecipient,
                    250,
                );

                await contract.publicMint(1, {value: await contract.tokenPrice()});

                const info = await contract.royaltyInfo(0, 10000);
                assert.equal(info[1].toNumber(), 250);
                assert.equal(info[0], royaltiesRecipient);
            });

            it('can set address(0) as royalties recipient', async function () {
                await contract.setRoyalties(ADDRESS_ZERO, 5000);

                await contract.publicMint(1, {value: await contract.tokenPrice()});

                const info = await contract.royaltyInfo(0, 10000);
                assert.equal(info[1].toNumber(), 5000);
                assert.equal(info[0], ADDRESS_ZERO);
            });
        });
    })
})