import React,{ useState, useEffect, useRef, useCallback, useContext } from 'react'
import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import IERC721 from '../contracts/IERC721A.json'
import axios from 'axios'
import { ethers } from 'ethers'
import { AccountContext, ProviderContext, AddressContext, NetworkContext} from '../context'
import { TransparentUpgradeableProxy, RoyaltyRegistryImplementation} from '../config'
import { AddEthereumChainResponse } from '@coinbase/wallet-sdk/dist/relay/Web3Response'

export default function Home() {
    const [loading, setLoading] = useState(false)
    const [loadingContractOwner, setLoadingContractOwner] = useState(false)
    const [inputContract, setInputContract] = useState('');
    const [validContract, setValidContract] = useState(null);
    const [invalidContract, setInvalidContract] = useState(null);
    const [newReceiverAddr, setNewReceiverAddr] = useState('');
    const [newRoyaltyCut, setNewRoyaltyCut] = useState(`0%`);
    const [currentRoyaltiesAddr, setCurrentRoyaltiesAddr] = useState([])
    const [currentRoyaltiesValue, setCurrentRoyaltiesValue] = useState([])
    const [contractOwner, setContractOwner] = useState('');
    const [registryAbi, setRegistryAbi] = useState();
    const [isOwner, setIsOwner] = useState(null);
    const account = useContext(AccountContext)
    const provider = useContext(ProviderContext)
    const address = useContext(AddressContext)
    const network = useContext(NetworkContext)

    const ETHERSCAN_KEY = process.env.NEXT_PUBLIC_ETHERSCAN_KEY
    const etherscanAddrUrl = `https://etherscan.io/address/`
    const url = `https://api.etherscan.io/api?module=contract&action=getabi&address=${inputContract}&apikey=KRE9VVJMXIP4ZEVEZSWDZET7NH73KQ4BDQ`
    const registry = `https://api.etherscan.io/api?module=contract&action=getabi&address=${RoyaltyRegistryImplementation}&apikey=KRE9VVJMXIP4ZEVEZSWDZET7NH73KQ4BDQ`


    const getContractOwner = useCallback(async () => {
        if(validContract == true) {
                setLoadingContractOwner(true)
                const res = await axios.get(url)
                if(res.data.result == 'Contract source code not verified') {
                    setInvalidContract(true)
                    setLoadingContractOwner(false)
                    
                } else {
                    setInvalidContract(false)
                    const abi = JSON.parse(res.data.result);
                    const _inputContract = new ethers.Contract(inputContract, abi, provider);
                    const owner = await _inputContract.owner();
                    setContractOwner(owner);
                    if(owner === account) {
                        setIsOwner(true)
                        setLoadingContractOwner(false)
                    }   else {
                        setIsOwner(false)
                        setLoadingContractOwner(false)
                    }
                }
        }

    }, [account, provider, validContract, inputContract, url])

    const getExistingRoyalties = useCallback(async () => {
        if(validContract == true && isOwner) {
            try{
                setLoadingContractOwner(true)
                const res = await axios.get(registry)
                const _abi = await JSON.parse(res.data.result);
                const _registry = new ethers.Contract(TransparentUpgradeableProxy, _abi, provider);
                const [data] = await _registry.readCollectionRoyalties(inputContract);
                const [royaltiesAddr, royaltiesValue] = data;
                let addr = royaltiesAddr.substring(0, 6) + "..." + royaltiesAddr.substring(36)
                let val = royaltiesValue / 100
                setCurrentRoyaltiesAddr(addr);
                setCurrentRoyaltiesValue(val);
                setLoadingContractOwner(false)
            } catch(e) {
                console.log(e)
                setLoadingContractOwner(false)
            }
        }
    } , [provider, validContract, registry, inputContract, isOwner])

    async function handleSubmit() {
        try {
            // setRoyaltiesByTokenAndTokenId
            if(provider && validContract == true) {
                try {
                    setLoading(true)
                    const res = await axios.get(registry)
                    const _abi = await JSON.parse(res.data.result);
                    const signer = provider.getSigner();
                    const _registry = new ethers.Contract(TransparentUpgradeableProxy, _abi, signer);
                    const setPercentage = newRoyaltyCut * 100;
                    const royaltiesByTokenAndTokenId = await _registry.setRoyaltiesByToken(
                        inputContract,
                        [[newReceiverAddr, setPercentage]],
                    );
                    royaltiesByTokenAndTokenId.wait().then(() => {
                        //update royalties
                        getExistingRoyalties()
                        setLoading(false)
                    })
                } catch(e) {
                    console.log(e)
                    setLoading(false)
                }
            }
        } catch(err) {
            console.error(err)
            alert('Error: ' + err.message)
            setLoading(false)
        }
    }

    useEffect(() => {
        if(provider && inputContract != '') {
            const isValid = ethers.utils.isAddress(inputContract);
            setValidContract(isValid)
        } else {
            setValidContract(null)
            setIsOwner(false)
        }
        if(validContract) {
            getContractOwner()
        }
        if(validContract && isOwner) {
            getExistingRoyalties()
        }
        const interval = setInterval(() => {

        }, 500);
        return () => clearInterval(interval);
    }, [provider, inputContract, validContract, getContractOwner, account, newRoyaltyCut, isOwner, getExistingRoyalties])

    return (
        <div className={styles.container}>
        <Head>
            <title>Royalties Registry</title>
            <meta name="NFT Embed Royalties" content="Register your collections royalties fast and easy" />
            <link rel="icon" href="/favicon.ico" />
        </Head>

            <main className={styles.main}>
                <div className={styles.ActionFrame}>
                    <div className={styles.ActionFrameHeader}>
                        <h1 className={styles.ActionHeaderTitle}>
                            Royalties
                        </h1>
                        <p className={styles.ActionHeaderSubTitle}>
                            Set the creator royalties for your NFT with ease
                        </p>
                    </div>
                    <div className={styles.ActionFrameBody}> 
                        <div className={styles.ActionFrameContractDiv}>
                            <label className={styles.ActionLabelTitle}>
                                Collection Address
                            </label>
                            <input 
                                className={styles.ContractAddrInput}
                                type="text" 
                                disabled={!account && !provider || network != 1}
                                placeholder="Collection Address" 
                                value={inputContract}
                                onChange={(e) => setInputContract(e.target.value)}
                            />
                        </div>
                        {validContract == false && inputContract && (
                            <div className={styles.AlertNotOwner}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M10.3125 16.5H10.875V10.875H10.3125C10.0019 10.875 9.75 10.6231 9.75 10.3125V9.9375C9.75 9.62686 10.0019 9.375 10.3125 9.375H12.5625C12.8731 9.375 13.125 9.62686 13.125 9.9375V16.5H13.6875C13.9981 16.5 14.25 16.7519 14.25 17.0625V17.4375C14.25 17.7481 13.9981 18 13.6875 18H10.3125C10.0019 18 9.75 17.7481 9.75 17.4375V17.0625C9.75 16.7519 10.0019 16.5 10.3125 16.5ZM12 5.25C11.1716 5.25 10.5 5.92158 10.5 6.75C10.5 7.57842 11.1716 8.25 12 8.25C12.8284 8.25 13.5 7.57842 13.5 6.75C13.5 5.92158 12.8284 5.25 12 5.25Z" fill="#4D66EB"/>
                                    <path fillRule="evenodd" clipRule="evenodd" d="M12.0008 23.2008C18.1864 23.2008 23.2008 18.1864 23.2008 12.0008C23.2008 5.81519 18.1864 0.800781 12.0008 0.800781C5.81519 0.800781 0.800781 5.81519 0.800781 12.0008C0.800781 18.1864 5.81519 23.2008 12.0008 23.2008Z" stroke="#4D66EB" strokeWidth="1.5" strokeLinecap="round"/>
                                </svg>
                                <p className={styles.AlertNotOwnerText}>Invalid Contract address</p>
                            </div>
                        )}
                        {!loadingContractOwner && validContract && isOwner == false && !invalidContract && (
                            <div className={styles.AlertNotOwner}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M10.3125 16.5H10.875V10.875H10.3125C10.0019 10.875 9.75 10.6231 9.75 10.3125V9.9375C9.75 9.62686 10.0019 9.375 10.3125 9.375H12.5625C12.8731 9.375 13.125 9.62686 13.125 9.9375V16.5H13.6875C13.9981 16.5 14.25 16.7519 14.25 17.0625V17.4375C14.25 17.7481 13.9981 18 13.6875 18H10.3125C10.0019 18 9.75 17.7481 9.75 17.4375V17.0625C9.75 16.7519 10.0019 16.5 10.3125 16.5ZM12 5.25C11.1716 5.25 10.5 5.92158 10.5 6.75C10.5 7.57842 11.1716 8.25 12 8.25C12.8284 8.25 13.5 7.57842 13.5 6.75C13.5 5.92158 12.8284 5.25 12 5.25Z" fill="#4D66EB"/>
                                    <path fillRule="evenodd" clipRule="evenodd" d="M12.0008 23.2008C18.1864 23.2008 23.2008 18.1864 23.2008 12.0008C23.2008 5.81519 18.1864 0.800781 12.0008 0.800781C5.81519 0.800781 0.800781 5.81519 0.800781 12.0008C0.800781 18.1864 5.81519 23.2008 12.0008 23.2008Z" stroke="#4D66EB" strokeWidth="1.5" strokeLinecap="round"/>
                                </svg>
                                <p className={styles.AlertNotOwnerText}>You dont own this collection</p>
                            </div>
                        )}
                        {!loadingContractOwner && validContract && isOwner && !invalidContract && (
                            <div className={styles.AlertNotOwnerRoyalties}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M10.3125 16.5H10.875V10.875H10.3125C10.0019 10.875 9.75 10.6231 9.75 10.3125V9.9375C9.75 9.62686 10.0019 9.375 10.3125 9.375H12.5625C12.8731 9.375 13.125 9.62686 13.125 9.9375V16.5H13.6875C13.9981 16.5 14.25 16.7519 14.25 17.0625V17.4375C14.25 17.7481 13.9981 18 13.6875 18H10.3125C10.0019 18 9.75 17.7481 9.75 17.4375V17.0625C9.75 16.7519 10.0019 16.5 10.3125 16.5ZM12 5.25C11.1716 5.25 10.5 5.92158 10.5 6.75C10.5 7.57842 11.1716 8.25 12 8.25C12.8284 8.25 13.5 7.57842 13.5 6.75C13.5 5.92158 12.8284 5.25 12 5.25Z" fill="#4D66EB"/>
                                    <path fillRule="evenodd" clipRule="evenodd" d="M12.0008 23.2008C18.1864 23.2008 23.2008 18.1864 23.2008 12.0008C23.2008 5.81519 18.1864 0.800781 12.0008 0.800781C5.81519 0.800781 0.800781 5.81519 0.800781 12.0008C0.800781 18.1864 5.81519 23.2008 12.0008 23.2008Z" stroke="#4D66EB" strokeWidth="1.5" strokeLinecap="round"/>
                                </svg>
                                <p className={styles.AlertNotOwnerTextRoyalties}>
                                    Current royalties:  {currentRoyaltiesValue}% 
                                    <a href={`${etherscanAddrUrl} + ${currentRoyaltiesAddr}`} className={styles.AlertNotOwnerTextRoyalties}>
                                        to: {currentRoyaltiesAddr},  
                                    </a>
                                </p>
                            </div>
                        )}
                        {loadingContractOwner && validContract && isOwner == false && network == 1 &&(
                            <div className={styles.AlertNotOwner}>
                                <p className={styles.AlertNotOwnerText}>... Processing ...</p>
                            </div>
                        )}
                        {!loadingContractOwner && validContract && isOwner == false && network == 1 && invalidContract &&(
                            <div className={styles.AlertNotOwner}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M10.3125 16.5H10.875V10.875H10.3125C10.0019 10.875 9.75 10.6231 9.75 10.3125V9.9375C9.75 9.62686 10.0019 9.375 10.3125 9.375H12.5625C12.8731 9.375 13.125 9.62686 13.125 9.9375V16.5H13.6875C13.9981 16.5 14.25 16.7519 14.25 17.0625V17.4375C14.25 17.7481 13.9981 18 13.6875 18H10.3125C10.0019 18 9.75 17.7481 9.75 17.4375V17.0625C9.75 16.7519 10.0019 16.5 10.3125 16.5ZM12 5.25C11.1716 5.25 10.5 5.92158 10.5 6.75C10.5 7.57842 11.1716 8.25 12 8.25C12.8284 8.25 13.5 7.57842 13.5 6.75C13.5 5.92158 12.8284 5.25 12 5.25Z" fill="#4D66EB"/>
                                    <path fillRule="evenodd" clipRule="evenodd" d="M12.0008 23.2008C18.1864 23.2008 23.2008 18.1864 23.2008 12.0008C23.2008 5.81519 18.1864 0.800781 12.0008 0.800781C5.81519 0.800781 0.800781 5.81519 0.800781 12.0008C0.800781 18.1864 5.81519 23.2008 12.0008 23.2008Z" stroke="#4D66EB" strokeWidth="1.5" strokeLinecap="round"/>
                                </svg>
                                <p className={styles.AlertNotOwnerText}>Cant find verified source code</p>
                            </div>
                        )}
                        <div className={styles.RoyaltyDiv}>
                            <div className={styles.RoyaltyAddressDiv}>
                                <label className={styles.RoyaltyAddrLabel}>Receiver Address</label>
                                <input
                                    className={styles.RoyaltyAddrInput}
                                    type="text"
                                    placeholder="Receiver Address"
                                    required
                                    disabled={isOwner != true || validContract == false}
                                    value={newReceiverAddr}
                                    onChange={(e) => setNewReceiverAddr(e.target.value)}
                                />
                            </div>
                            <div className={styles.RoyaltyCutDiv}>
                                <label className={styles.RoyaltyAddrLabel} >Royalty Percent</label>
                                <input 
                                    className={styles.RoyaltyPercentInput} 
                                    type="number"
                                    min={0}
                                    max={20}
                                    placeholder={`0% - 20%`}
                                    required
                                    disabled={isOwner != true || validContract == false}
                                    value={newRoyaltyCut} 
                                    onChange={(e) => setNewRoyaltyCut(e.target.value)}
                                />
                                
                            </div>
                        </div>
                        {!loading && (    
                            <button 
                                disabled={isOwner != true || !newReceiverAddr || !newRoyaltyCut || !provider }
                                className={styles.SetRoyaltiesButton}
                                onClick={handleSubmit}
                            >
                                Set the royalty
                            </button>
                        )}
                        {loading && (    
                            <button 
                                disabled={true}
                                className={styles.SetRoyaltiesButton}
                            >
                                <svg className={styles.Spinner} width="19" height="18" viewBox="0 0 19 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M17.5 9C17.5 11.2203 16.5955 13.2294 15.1348 14.6788C13.6888 16.1136 11.6979 17 9.5 17C5.08172 17 1.5 13.4183 1.5 9C1.5 4.58172 5.08172 1 9.5 1C13.31 1 16.498 3.66345 17.3035 7.23001" stroke="url(#paint0_angular_3739_24590)" strokeWidth="1.5" strokeLinecap="round"/>
                                        <defs>
                                            <radialGradient id="paint0_angular_3739_24590" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse"   gradientTransform="translate(9.5 9) rotate(-7.12502) scale(8.06226)">
                                                <stop stopOpacity="0"/>
                                                <stop offset="1"/>
                                            </radialGradient>
                                        </defs>
                                </svg>
                                Setting up royalties...
                            </button>
                        )}
                    </div>
                </div>
            </main>

            <footer className={styles.footer}>

            </footer>
        </div>
    )
}
