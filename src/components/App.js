import React, {Component} from 'react';
import Web3 from 'web3';
import './App.css';
import ReactFullpage from '@fullpage/react-fullpage';
import TwitterLogoSvg from '../svgs/twitter.svg';
import OpenseaLogoSvg from '../svgs/opensea.svg';
import PolygonLogoSvg from '../svgs/polygon.svg';
import Leaders from '../abis/Leaders.json'
import Swal from 'sweetalert2'
import {Splide, SplideSlide} from '@splidejs/react-splide';
import {AutoScroll} from '@splidejs/splide-extension-auto-scroll';
import '@splidejs/splide/dist/css/themes/splide-skyblue.min.css';
import backgroundVideosJson from "../videos/videos.json";
import RangeInput from "./RangeInput";

// function importAll(r) {
//     let images = {};
//     r.keys().forEach((item, _) => {
//         images[item.replace('./', '')] = r(item);
//     });
//     return images
// }

function slider(direction, n) {
    // function shuffle(array) {
    //     return array.sort(() => Math.random() - 0.5);
    // }

    function divs() {
        let items = [];
        let arr = Array.from(Array(80).keys(), (_, x) => x).slice(n * 20, (n + 1) * 20);
        for (const v of arr) {
            items.push(<SplideSlide><img
                src={`https://storage.yandexcloud.net/leaders/examples_250/${v + 1}.png`}/></SplideSlide>)
        }
        return items;
    }

    return (
        <div className="images-slider">
            <Splide
                options={{
                    type: 'loop',
                    autoWidth: true,
                    pagination: false,
                    arrows: false,
                    direction: direction ? "ltr" : "rtl",
                    autoScroll: {
                        speed: 0.75,
                        pauseOnHover: false,
                        pauseOnFocus: false,
                    }
                }}
                Extensions={{AutoScroll}}>
                {divs()}
            </Splide>
        </div>
    );
}

let minInnerHeight = Infinity;

function appHeight() {
    const doc = document.documentElement;
    minInnerHeight = Math.min(minInnerHeight, window.innerHeight);
    doc.style.setProperty('--vh', (minInnerHeight * .01) + 'px');
}

window.onload = appHeight;

class App extends Component {
    backgroundVideo;

    showToast() {
        const Toast = Swal.mixin({
            toast: true,
            position: 'top',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true,
            didOpen: (toast) => {
                toast.addEventListener('mouseenter', Swal.stopTimer);
                toast.addEventListener('mouseleave', Swal.resumeTimer);
            }
        })

        Toast.fire({
            icon: 'success',
            title: 'Signed in successfully'
        })
    }

    fadein(element, opacity) {
        element.classList.add("fadein-class");
        element.style.opacity = opacity;
    }

    async componentWillMount() {
        appHeight();
        this.backgroundVideo = this.getRandomVideo();
        await this.loadWeb3();
        await this.loadBlockChainData();
    }

    componentDidMount() {
        appHeight();

        let videoElement = document.getElementById("backgroundVideo");
        let FINAL_VIDEO_OPACITY = 0.75
        if (window.screen.width > 600) {
            if (videoElement.readyState >= 3) {
                this.fadein(videoElement, FINAL_VIDEO_OPACITY);
            } else {
                videoElement.onloadeddata = (e) => {
                    if (videoElement.readyState >= 3) {
                        this.fadein(videoElement, FINAL_VIDEO_OPACITY);
                    }
                };
            }
        }
    }

    async loadWeb3() {
        if (window.ethereum) {
            window.web3 = new Web3(window.ethereum)
            await window.ethereum.enable()
            this.setState({isWeb3Loaded: true})
        } else if (window.web3) {
            window.web3 = new Web3(window.web3.currentProvider)
            this.setState({isWeb3Loaded: true})
        } else {
            this.setState({isWeb3Loaded: false})
        }

        if (this.state.isWeb3Loaded) {
            window.ethereum.on('accountsChanged', function (accounts) {
                window.location.reload()
            })

            window.ethereum.on('networkChanged', function (networkId) {
                window.location.reload()
            })
        }
    }

    async syncContract() {
        const contract = this.state.contract
        const mintAtOnceLimit = parseInt(await contract.methods.mintAtOnceLimit.call().call())
        const contractStatus = parseInt(await contract.methods.getContractStatus().call())
        const price = parseInt(await contract.methods.tokenPrice.call().call())
        const whitelistPrice = parseInt(await contract.methods.whitelistTokenPrice.call().call())
        const totalSupply = parseInt(await contract.methods.totalSupply().call())
        const maxSupply = parseInt(await contract.methods.maxSupply.call().call())
        const whitelistQuota = parseInt(await contract.methods.getWhitelistQuota(this.state.account).call())
        const maxMintNumber = this.getMaxMintNumber(contractStatus, maxSupply, totalSupply, mintAtOnceLimit, whitelistQuota)
        this.setState({
            mintAtOnceLimit: mintAtOnceLimit,
            contractStatus: contractStatus,
            price: price,
            whitelistPrice: whitelistPrice,
            totalSupply: totalSupply,
            maxSupply: maxSupply,
            whitelistQuota: whitelistQuota,
            maxMintNumber: maxMintNumber
        })
    }

    getMaxMintNumber(contractStatus, maxSupply, totalSupply, mintAtOnceLimit, whiteListQuota) {
        if (contractStatus === 1) {
            return Math.min(maxSupply - totalSupply, mintAtOnceLimit, whiteListQuota)
        } else if (contractStatus === 2) {
            return Math.min(maxSupply - totalSupply, mintAtOnceLimit);
        } else {
            return 0;
        }
    }

    async loadBlockChainData() {
        if (this.state.isWeb3Loaded) {
            const web3 = window.web3
            const accounts = await web3.eth.getAccounts()
            this.setState({account: accounts[0]})
            const networkId = await web3.eth.net.getId()
            const networkData = Leaders.networks[networkId]
            if (networkData) {
                const abi = Leaders.abi
                const address = networkData.address
                const contract = new web3.eth.Contract(abi, address)
                this.setState({contract: contract, isContractLoaded: true})
                await this.syncContract()
            } else {
                this.setState({isContractLoaded: false})
            }
        }
    }


    mint = async (number) => {
        if (this.state.contractStatus === 1) {
            await this.state.contract.methods.whitelistMint(number).send({
                from: this.state.account,
                value: number * this.state.whitelistPrice
            })
        } else if (this.state.contractStatus === 2) {
            await this.state.contract.methods.publicMint(number).send({
                from: this.state.account,
                value: number * this.state.price
            })
        }
        this.setState({mintNumber: 1})
        window.location.reload()
    }

    constructor(props) {
        super(props);
        this.state = {
            isWeb3Loaded: false,
            isContractLoaded: false,
            account: '',
            contract: null,
            maxSupply: 0,
            totalSupply: 0,
            leaders: [],
            error: '',
            mintAtOnceLimit: 30,
            mintNumber: 1,
            contractStatus: 0,
            price: 7000000000000000000,
            whitelistPrice: 3500000000000000000,
            whitelistQuota: 0,
            maxMintNumber: 0,
        }
        setInterval(function () {
            if (this.state.isContractLoaded) {
                this.syncContract()
            }
        }.bind(this), 2500);
    }

    randomInteger(min, max) {
        let rand = min - 0.5 + Math.random() * (max - min + 1);
        return Math.round(rand);
    }

    getRandomVideo() {
        let randIdx = this.randomInteger(0, backgroundVideosJson.length - 1);
        return backgroundVideosJson[randIdx];
    }

    getMintLeftString() {
        if (this.state.contract) {
            return `${this.state.maxSupply - this.state.totalSupply} / ${this.state.maxSupply} left`
        } else {
            return '';
        }
    }

    render() {
        return (
            <ReactFullpage
                licenseKey={'YOUR_KEY_HERE'}
                responsiveWidth={600}
                scrollingSpeed={750}
                anchors={['main', 'description', 'sliders', 'faq', 'mint']}
                navigation={true}
                fixedElements={'header'}
                render={({state, fullpageApi}) => {
                    return (
                        <ReactFullpage.Wrapper>
                            <div className="section fp-auto-height-responsive">
                                <section className="showcase">
                                    <header>
                                        <div className="header-element logo">
                                            <h2 onClick={() => fullpageApi.moveTo(1)}>0xLeaders</h2>
                                        </div>
                                        <div className="header-element social">
                                            <div><a target="_blank" rel="noopener noreferrer"
                                                    href="https://twitter.com/0xleaders">
                                                <object data={TwitterLogoSvg}/>
                                            </a></div>
                                            <div><a target="_blank" rel="noopener noreferrer"
                                                    href="https://opensea.io/collection/0xleaders">
                                                <object data={OpenseaLogoSvg}/>
                                            </a></div>
                                            <div><a target="_blank" rel="noopener noreferrer"
                                                    href="https://polygonscan.com/address/0x902629858c0d30b48ded21a77e59055a655707d9">
                                                <object data={PolygonLogoSvg}/>
                                            </a></div>
                                        </div>
                                    </header>
                                    <video autoPlay loop muted="true" data-keepplaying="true" playsInline
                                           src={`https://storage.yandexcloud.net/leaders/optimised_background/${this.backgroundVideo['idx']}.mp4`}
                                           id="backgroundVideo"/>
                                    <div id="leader-preview">
                                        <h2 className='name'>{this.backgroundVideo['display_name']}</h2>
                                        <h3 className='country'>{this.backgroundVideo['country']}</h3>
                                        <h4 className='government'>{this.backgroundVideo['governments'][0]}</h4>
                                        <h5 className='date'>{this.backgroundVideo['date']}</h5>
                                        <a
                                            onClick={() => fullpageApi.moveSectionDown()}>Explore</a>
                                    </div>
                                </section>
                            </div>
                            <div className="section fp-auto-height-responsive">
                                <section className="screen description">
                                    <div className="description-container">
                                        <div className="text">
                                            <h2>2189 unique leader NFTs</h2>
                                            <p>0xLeaders is a collection of 2189 unique nft. Each one corresponds to
                                                some leader's reign since World&nbsp;War&nbsp;II or independence of
                                                specific country. There are 199 countries of past and present
                                                gathered in collection.</p>
                                            <p><b>Touch the history by minting or buying ones on marketplace.</b></p>
                                        </div>
                                        <div className="example" id="slideshow">
                                            <video autoPlay loop muted="true" data-keepplaying="true" playsInline
                                                   src="https://storage.yandexcloud.net/leaders/description.mp4"/>
                                        </div>
                                    </div>
                                </section>
                            </div>
                            <div className="section fp-auto-height-responsive">
                                <section className="screen sliders">
                                    {slider(1, 0)}
                                    {slider(0, 1)}
                                    {slider(1, 2)}
                                    {slider(0, 3)}
                                </section>
                            </div>
                            <div className="section fp-auto-height-responsive">
                                <section className="screen FAQ">
                                    <div className="faq-container">
                                        <h1>FAQ</h1>
                                        <h3>Can the same leader have two cards?</h3>
                                        <p>Yes, he or she can. If the period of his or her reign was interrupted by
                                            the period of rule of another leader, or if he or she occupied another
                                            state, as in the case of Saddam Hussein and the invasion of Kuwait.
                                        </p>
                                        <h3>Is there royalty for the collection?</h3>
                                        <p>Yes it is, at a rate of 7.5%</p>
                                        <h3>Will cards be added over time?</h3>
                                        <p>Yes, they will. With the end of the powers of today's leaders, they will be
                                            added to the collection.
                                        </p>
                                        <h3>How were leaders and types of government chosen?</h3>
                                        <p>The leaders who were taken into the collection were in power for more than
                                            7 days and de facto and solely ruled an independent country. Country
                                            information was taken from the <a
                                                href="http://www.rochester.edu/college/faculty/hgoemans/data.htm"
                                                target="_blank">Archigos</a>
                                            &nbsp;scientific work. Information about governments was taken from
                                            the <a
                                                href="https://oneearthfuture.org/datasets/reign"
                                                target="_blank">REIGN</a>
                                            &nbsp;scientific work.
                                        </p>
                                        <h3>Do NFT pictures appear instantly?</h3>
                                        <p>Yes, NFT metadata is available immediately after minting. Besides,
                                            metadata of not minted ones is strictly inaccessible. Within a couple of
                                            minutes, minted NFT becomes available on opensea.</p>
                                    </div>
                                </section>
                            </div>
                            <div className="section fp-auto-height-responsive">
                                <section className="screen mint">
                                    <div className="mint-container">
                                        <h2>Mint Tokens</h2>
                                        <p className="price">Public mint price
                                            is {(this.state.price / 10 ** 18).toString()} matic</p>
                                        <p className="price">Whitelist mint price
                                            is {(this.state.whitelistPrice / 10 ** 18).toString()} matic</p>
                                        <p className="price">Maximum {this.state.mintAtOnceLimit.toString()} cards per
                                            transaction</p>
                                        {!this.state.isWeb3Loaded && <div className="center-column-container">
                                            <h4>Use Web3 browser.</h4>
                                            <h4>Try Metamask extension.</h4>
                                        </div>}
                                        {(this.state.isWeb3Loaded && !this.state.isContractLoaded) &&
                                        <div className="center-column-container">
                                            <h4>Connect to Polygon chain.</h4>
                                        </div>}
                                        {this.state.isContractLoaded && <div className="center-column-container">
                                            {this.state.contractStatus === 0 &&
                                            <h4 className="price">Sale has not started yet</h4>}
                                            {this.state.contractStatus === 1 &&
                                            <h4 className="price">Whitelist sale</h4>}
                                            {this.state.contractStatus === 1 &&
                                            <h4 className="price">Your quota - {this.state.whitelistQuota} NFTs</h4>}
                                            {this.state.contractStatus === 2 &&
                                            <h4 className="price">Public sale</h4>}
                                            <h3 id="mintLeft">{this.getMintLeftString()}</h3>
                                            <div className="center-column-container"
                                                 style={{
                                                     opacity: 1 - 0.75 * (this.state.maxMintNumber === 0),
                                                     pointerEvents: this.state.maxMintNumber === 0 ? "none" : "auto",
                                                 }}>
                                                <div className="range-input" style={{
                                                    display: this.state.maxMintNumber === 1 ? "none" : "auto"
                                                }}>
                                                    <RangeInput
                                                        defaultValue={this.state.mintNumber}
                                                        onChange={mintNumber => this.setState({mintNumber: mintNumber})}
                                                        maxValue={Math.max(2, this.state.maxMintNumber)}
                                                    />
                                                </div>
                                                <div className="button"
                                                     style={{
                                                         marginTop: this.state.maxMintNumber === 1 ? 25 : 50
                                                     }}
                                                     onClick={(event) => {
                                                         this.mint(this.state.mintNumber)
                                                     }}>
                                                    MINT
                                                </div>
                                            </div>
                                        </div>}
                                    </div>
                                </section>
                            </div>
                        </ReactFullpage.Wrapper>
                    );
                }}
            />
        );
    }
}

export default App;
