import '../styles/globals.css'
import styles from '../styles/Home.module.css'
import React,{ useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ethers } from 'ethers'
import Blockies from 'react-blockies';
import Web3Modal from 'web3modal'
import WalletConnectProvider from '@walletconnect/web3-provider'
import CoinbaseWalletSDK from '@coinbase/wallet-sdk';
import { ProviderContext, AccountContext, AddressContext, NetworkContext} from '../context.js'
import { EmbedAddress } from '../config'
import axios from 'axios'

const INFURA_ID = process.env.NEXT_PUBLIC_INFURA_ID;
const wETHAddr = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
const etherscanAddrUrl = `https://etherscan.io/address/`

function MyApp({ Component, pageProps }) {

    const [provider, setProvider] = useState(null);
    const [account, setAccount] = useState(null);
    const [address, setAddress] = useState(null);
    const [network, setNetwork] = useState(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [ethBalance, setEthBalance] = useState(null);
    const [wethBalance, setWethBalance] = useState(null);
    const toggle = () => setDropdownOpen(!dropdownOpen);

    console.log(dropdownOpen)
    console.log(ethBalance)
    async function getWeb3Modal() {
        const web3modal = new Web3Modal({
            network: 'mainnet',
            cacheProvider: false,
            providerOptions: {
                walletconnect: {
                    package: WalletConnectProvider,
                    options: { 
                        infuraId: INFURA_ID
                    },
                },
                coinbasewallet: {
                    package: CoinbaseWalletSDK, // Required
                    options: {
                        appName: "NFT Embed Royalties", // Required
                        infuraId:  INFURA_ID,
                        chainId: 1, 
                        darkMode: false
                    }
                }
            },
        })
        return web3modal
    }

    async function getBalance() {
        if(account && network == 1) {
            try {
                const res = axios.get(
                    `https://api.etherscan.io/api?module=account&action=balance&address=${account}&tag=latest&apikey=KRE9VVJMXIP4ZEVEZSWDZET7NH73KQ4BDQ`
                )
                let data = (await res).data.result
                let balance = ethers.utils.formatEther(data)
                setEthBalance(parseFloat(balance.toString()).toFixed(2))
                // const wethRes = axios.get(
                //     `https://api.etherscan.io/api?module=contract&action=getabi&address=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2&apikey=KRE9VVJMXIP4ZEVEZSWDZET7NH73KQ4BDQ`
                // )
                // let wethAbi = (await wethRes).data.result
                // const contract = new ethers.Contract(wETHAddr, wethAbi, provider);
                // const wethBalance = await contract.balanceOf(account)
                // let wdata = ethers.utils.formatEther(wethBalance)
                // setWethBalance(parseFloat(wdata.toString()).toFixed(2))


            } catch (error) {
                console.log(error)
            }
        }
    }

    async function fetchNetwork() {
        try {
            if (provider) { 
                const _provider = new ethers.providers.Web3Provider(window.ethereum, "any");
                _provider.on("network", (newNetwork, oldNetwork) => {
                    // When a Provider makes its initial connection, it emits a "network"
                    // event with a null oldNetwork along with the newNetwork. So, if the
                    // oldNetwork exists, it represents a changing network
                    if (oldNetwork) {
                        window.location.reload();
                    }
                },);
            }
        } catch (error) {
            console.error(error)
        }
    }

    async function switchNetwork() {
        ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{
                chainId: "0x1"
            }]
        }).then( () => {
            window.location.reload();
        }).catch(error => {
                console.error(error);
        });
    }


        
    const connect = useCallback(async () => {
        try {
            const web3Modal = await getWeb3Modal()
            const connection = await web3Modal.connect()
            const provider = new ethers.providers.Web3Provider(connection)
            const network = await provider.getNetwork()
            const _network = network.chainId.toString()
            setProvider(provider)
            setNetwork(_network)
            const accounts = await provider.listAccounts()
            setAccount(accounts[0])
            const name = await provider.lookupAddress(accounts[0])
            if (name) {
                setAddress(name);
            } else {
                setAddress(accounts[0].substring(0, 6) + "..." + accounts[0].substring(36)); 
            }
            setNetwork(_network)
        }   catch (err) {
            console.error(err);
            setNetwork(null);
        }
    }, []);

    async function logout(){
        setAccount(null);
        setTimeout(() => {
            window.location.reload();
        }, 1);
    }

    useEffect(() => {
        fetchNetwork();
        getBalance()
    })
    
    return (
        <div className={styles.container}>
            {network != 1 && provider && (
                <div className={styles.Backdrop}>
                    <div className={styles.errorBody}>
                            <Image src="/error.webp" alt="error" width={100} height={100} />
                        <p className={styles.errorText}>Please switch your wallet network to <strong>Mainnet</strong> to use the app. If you still encounter problems, you may want to switch to a different wallet.</p>
                        <button className={styles.errorButton} onClick={switchNetwork}>Switch Network</button>
                    </div>
                </div>
            )}
            {dropdownOpen && (
                <div className={styles.dropdown}>
                    <div className={styles.dropdownHeader}> 
                        <h1 className={styles.dropdownTitle}>
                            <Blockies className={styles.dropdownBlockie} seed={account} size={8} scale={4} />
                            <a href={`${etherscanAddrUrl}${account}`} target='_blank' rel='noreferrer' className={styles.dropdownAddress}>{address}</a>
                        </h1>
                    </div>
                    <div className={styles.dropdownBody}>
                    <div className={styles.dropdownBodyCtn}>
                    <div className={styles.dropdownBodyFirst}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="12" fill="white"/>
                            <circle cx="12" cy="12" r="11.75" stroke="black" strokeOpacity="0.1" strokeWidth="0.5"/>
                            <g clipPath="url(#clip0_3883_30545)">
                            <path d="M12.0078 15.9915V20.3985L16.8014 12.7148L12.0078 15.9915Z" fill="#2F3030"/>
                            <path d="M16.6175 12.3419L12.0078 3.59961V9.95635L16.6175 12.3419Z" fill="#2F3030"/>
                            <path d="M12.0078 9.95508V15.3798L16.5799 12.3239L12.0078 9.95508Z" fill="#131313"/>
                            <path d="M7.39844 12.3419L12.0073 3.59961V9.95635L7.39844 12.3419Z" fill="#828384"/>
                            <path d="M12.0064 9.95508V15.3798L7.42188 12.3239L12.0064 9.95508Z" fill="#343535"/>
                            <path d="M11.9925 15.9915V20.3985L7.19922 12.7148L11.9925 15.9915Z" fill="#828384"/>
                            </g>
                            <defs>
                            <clipPath id="clip0_3883_30545">
                            <rect width="9.6" height="16.8" fill="white" transform="translate(7.19922 3.59961)"/>
                            </clipPath>
                            </defs>
                        </svg>
                            <p className={styles.ethBalance}>
                                ETH
                            </p>
                        </div>

                        <span className={styles.ethBalance}>{ethBalance}</span>
                    </div>                        
                        <button className={styles.logoutButton} onClick={logout}>Disconnect</button>
                    </div>
                </div>
            )}
            <header className={styles.Header}>
                <div className={styles.HeaderDiv}>
                    <a
                        href="https://www.nftembed.org/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.BackToHomeText}
                    >
                        <svg width="135" height="20" viewBox="0 0 135 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6 6L2 10L6 14" stroke="#18181B" strokeWidth="2.6" strokeLinecap="round" stroke-Linejoin="round"/>
                            <rect x="11.3" y="1.3" width="17.4" height="17.4" rx="2.7" stroke="#18181B" strokeWidth="2.6"/>
                            <path d="M34 14L38 10L34 6" stroke="#18181B" strokeWidth="2.6" strokeLinecap="round" stroke-Linejoin="round"/>
                            <path d="M47.056 16V4.08H48.96L55.36 12.512L54.336 12.752V4.08H56.816V16H54.896L48.608 7.504L49.536 7.264V16H47.056ZM58.451 16V4.08H66.611V6.24H60.931V9.264H65.811V11.424H60.931V16H58.451ZM69.5056 16V6.24H66.4816V4.08H74.9616V6.24H71.9856V16H69.5056ZM78.1047 16V4.08H86.1208V6.24H80.5848V8.944H85.8008V11.104H80.5848V13.84H86.1208V16H78.1047ZM86.8706 16V7.264H89.1106V9.392L88.8706 9.04C88.9986 8.368 89.308 7.872 89.7986 7.552C90.2893 7.232 90.876 7.072 91.5586 7.072C92.284 7.072 92.9186 7.25867 93.4626 7.632C94.0173 7.99467 94.364 8.48533 94.5026 9.104L93.8146 9.168C94.1026 8.45333 94.5133 7.92533 95.0466 7.584C95.58 7.24267 96.204 7.072 96.9186 7.072C97.548 7.072 98.1026 7.21067 98.5826 7.488C99.0733 7.76533 99.4573 8.15467 99.7346 8.656C100.012 9.14667 100.151 9.72267 100.151 10.384V16H97.7506V10.896C97.7506 10.5547 97.6866 10.2613 97.5586 10.016C97.4413 9.77067 97.2706 9.57867 97.0466 9.44C96.8226 9.30133 96.5506 9.232 96.2306 9.232C95.9213 9.232 95.6493 9.30133 95.4146 9.44C95.1906 9.57867 95.0146 9.77067 94.8866 10.016C94.7693 10.2613 94.7106 10.5547 94.7106 10.896V16H92.3106V10.896C92.3106 10.5547 92.2466 10.2613 92.1186 10.016C92.0013 9.77067 91.8306 9.57867 91.6066 9.44C91.3826 9.30133 91.1106 9.232 90.7906 9.232C90.4813 9.232 90.2093 9.30133 89.9746 9.44C89.7506 9.57867 89.5746 9.77067 89.4466 10.016C89.3293 10.2613 89.2706 10.5547 89.2706 10.896V16H86.8706ZM106.146 16.192C105.549 16.192 104.994 16.0853 104.482 15.872C103.981 15.648 103.575 15.3227 103.266 14.896L103.49 14.4V16H101.25V3.888H103.65V8.928L103.282 8.448C103.57 8.01067 103.959 7.67467 104.45 7.44C104.951 7.19467 105.522 7.072 106.162 7.072C106.994 7.072 107.746 7.27467 108.418 7.68C109.09 8.08533 109.623 8.63467 110.018 9.328C110.413 10.0107 110.61 10.7787 110.61 11.632C110.61 12.4747 110.413 13.2427 110.018 13.936C109.634 14.6293 109.106 15.1787 108.434 15.584C107.762 15.9893 106.999 16.192 106.146 16.192ZM105.858 14.032C106.306 14.032 106.701 13.9307 107.042 13.728C107.383 13.5253 107.65 13.2427 107.842 12.88C108.034 12.5173 108.13 12.1013 108.13 11.632C108.13 11.1627 108.034 10.752 107.842 10.4C107.65 10.0373 107.383 9.75467 107.042 9.552C106.701 9.33867 106.306 9.232 105.858 9.232C105.431 9.232 105.047 9.33333 104.706 9.536C104.375 9.73867 104.114 10.0213 103.922 10.384C103.741 10.7467 103.65 11.1627 103.65 11.632C103.65 12.1013 103.741 12.5173 103.922 12.88C104.114 13.2427 104.375 13.5253 104.706 13.728C105.047 13.9307 105.431 14.032 105.858 14.032ZM115.744 16.192C114.816 16.192 114.01 15.9893 113.328 15.584C112.645 15.168 112.117 14.6133 111.744 13.92C111.37 13.2267 111.184 12.4587 111.184 11.616C111.184 10.7413 111.376 9.96267 111.76 9.28C112.154 8.59733 112.682 8.05867 113.344 7.664C114.005 7.26933 114.752 7.072 115.584 7.072C116.277 7.072 116.89 7.184 117.424 7.408C117.957 7.62133 118.405 7.92533 118.768 8.32C119.141 8.71467 119.424 9.17333 119.616 9.696C119.808 10.208 119.904 10.768 119.904 11.376C119.904 11.5467 119.893 11.7173 119.872 11.888C119.861 12.048 119.834 12.1867 119.792 12.304H113.248V10.544H118.432L117.296 11.376C117.402 10.9173 117.397 10.512 117.28 10.16C117.162 9.79733 116.954 9.51467 116.656 9.312C116.368 9.09867 116.01 8.992 115.584 8.992C115.168 8.992 114.81 9.09333 114.512 9.296C114.213 9.49867 113.989 9.79733 113.84 10.192C113.69 10.5867 113.632 11.0667 113.664 11.632C113.621 12.1227 113.68 12.5547 113.84 12.928C114 13.3013 114.245 13.5947 114.576 13.808C114.906 14.0107 115.306 14.112 115.776 14.112C116.202 14.112 116.565 14.0267 116.864 13.856C117.173 13.6853 117.413 13.4507 117.584 13.152L119.504 14.064C119.333 14.4907 119.061 14.864 118.688 15.184C118.325 15.504 117.893 15.7547 117.392 15.936C116.89 16.1067 116.341 16.192 115.744 16.192ZM124.949 16.192C124.096 16.192 123.333 15.9893 122.661 15.584C121.989 15.1787 121.456 14.6293 121.061 13.936C120.677 13.2427 120.485 12.4747 120.485 11.632C120.485 10.7787 120.682 10.0107 121.077 9.328C121.472 8.63467 122.005 8.08533 122.677 7.68C123.349 7.27467 124.101 7.072 124.933 7.072C125.573 7.072 126.138 7.19467 126.629 7.44C127.13 7.67467 127.525 8.01067 127.813 8.448L127.445 8.928V3.888H129.845V16H127.605V14.4L127.829 14.896C127.53 15.3227 127.125 15.648 126.613 15.872C126.101 16.0853 125.546 16.192 124.949 16.192ZM125.237 14.032C125.674 14.032 126.058 13.9307 126.389 13.728C126.72 13.5253 126.976 13.2427 127.157 12.88C127.349 12.5173 127.445 12.1013 127.445 11.632C127.445 11.1627 127.349 10.7467 127.157 10.384C126.976 10.0213 126.72 9.73867 126.389 9.536C126.058 9.33333 125.674 9.232 125.237 9.232C124.8 9.232 124.405 9.33867 124.053 9.552C123.712 9.75467 123.445 10.0373 123.253 10.4C123.061 10.752 122.965 11.1627 122.965 11.632C122.965 12.1013 123.061 12.5173 123.253 12.88C123.445 13.2427 123.712 13.5253 124.053 13.728C124.405 13.9307 124.8 14.032 125.237 14.032Z" fill="#18181B"
                        />
                        </svg>                 
                    </a>
                    <p>Royalties</p>
                </div>
                <div className={styles.HeaderDiv}>
                    {!account && <button className={styles.ConnectButton} onClick={connect}>Connect Wallet</button>}
                    {account && (
                        <>  
                            <button className={styles.ConnectedButton} onClick={toggle}>
                                <Blockies
                                    className={styles.Blockies}
                                    seed={account}
                                    size={6}
                                    scale={4}
                                />
                                {address}
                                {dropdownOpen ? 
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-caret-up" viewBox="0 0 16 16">
                                        <path d="M3.204 11h9.592L8 5.519 3.204 11zm-.753-.659 4.796-5.48a1 1 0 0 1 1.506 0l4.796 5.48c.566.647.106 1.659-.753 1.659H3.204a1 1 0 0 1-.753-1.659z"/>
                                    </svg> 
                                    :
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-caret-down-fill" viewBox="0 0 16 16">
                                        <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
                                    </svg>
                                }               
                            </button>
                        </>
                    )}
                </div>
            </header>
            <ProviderContext.Provider value={provider}>
                <AccountContext.Provider value={account}>
                    <AddressContext.Provider value={address}>
                        <NetworkContext.Provider value={network}>
                            <Component {...pageProps} />
                        </NetworkContext.Provider>
                    </AddressContext.Provider>
                </AccountContext.Provider>
            </ProviderContext.Provider>
        </div>
    );
}

export default MyApp
