import React,{ useState, useEffect, useRef, useCallback, useContext } from 'react'
import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import IERC721 from '../contracts/IERC721A.json'
import axios from 'axios'
import { ethers } from 'ethers'
import { AccountContext, ProviderContext, AddressContext, NetworkContext} from '../context'
import { TransparentUpgradeableProxy, RoyaltyRegistryImplementation} from '../config'

export default function Home() {
    const [loading, setLoading] = useState(false)
    const [loadingContractOwner, setLoadingContractOwner] = useState(false)
    const [inputContract, setInputContract] = useState('');
    const [validContract, setValidContract] = useState(null);
    const [invalidContract, setInvalidContract] = useState(null);
    const [validAddress, setValidAddress] = useState(false);
    const [newReceiverAddr, setNewReceiverAddr] = useState('');
    const [newRoyaltyCut, setNewRoyaltyCut] = useState(`0%`);
    const [currentRoyaltiesAddr, setCurrentRoyaltiesAddr] = useState([])
    const [currentRoyaltiesValue, setCurrentRoyaltiesValue] = useState([0])
    const [contractOwner, setContractOwner] = useState('');
    const [registryAbi, setRegistryAbi] = useState();
    const [isOwner, setIsOwner] = useState(null);
    const [txSuccess, setTxSuccess] = useState(false);
    const [txError, setTxError] = useState(false);
    const account = useContext(AccountContext)
    const provider = useContext(ProviderContext)
    const address = useContext(AddressContext)
    const network = useContext(NetworkContext)
    
    const toggle = () => setTxSuccess(!txSuccess);
    const toggleError = () => setTxError(!txError);

    const ETHERSCAN_KEY = process.env.NEXT_PUBLIC_ETHERSCAN_KEY
    const url = `https://api.etherscan.io/api?module=contract&action=getabi&address=${inputContract}&apikey=KRE9VVJMXIP4ZEVEZSWDZET7NH73KQ4BDQ`
    const registry = `https://api.etherscan.io/api?module=contract&action=getabi&address=${RoyaltyRegistryImplementation}&apikey=KRE9VVJMXIP4ZEVEZSWDZET7NH73KQ4BDQ`

    console.log("tx Success: ",txSuccess)
    console.log("tx Error: ",txError)

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
                        setTxSuccess(true)
                        setLoading(false)
                    })
                } catch(e) {
                    console.log(e)
                    setTxError(true)
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
        //inputContract != '' && isOwner
        if(provider && inputContract != '' && newReceiverAddr != '') {
            const _addr = ethers.utils.isAddress(newReceiverAddr);
            setValidAddress(_addr)
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
    }, [provider, inputContract, validContract, getContractOwner, account, newRoyaltyCut, isOwner, getExistingRoyalties, newReceiverAddr, validAddress])

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
                            Set the creator royalties with ease
                        </h1>
                    </div>
                    <form className={styles.ActionFrameBody}> 
                        {!account && !provider && (
                            <div className={styles.AlertNotOwner}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M10.3125 16.5H10.875V10.875H10.3125C10.0019 10.875 9.75 10.6231 9.75 10.3125V9.9375C9.75 9.62686 10.0019 9.375 10.3125 9.375H12.5625C12.8731 9.375 13.125 9.62686 13.125 9.9375V16.5H13.6875C13.9981 16.5 14.25 16.7519 14.25 17.0625V17.4375C14.25 17.7481 13.9981 18 13.6875 18H10.3125C10.0019 18 9.75 17.7481 9.75 17.4375V17.0625C9.75 16.7519 10.0019 16.5 10.3125 16.5ZM12 5.25C11.1716 5.25 10.5 5.92158 10.5 6.75C10.5 7.57842 11.1716 8.25 12 8.25C12.8284 8.25 13.5 7.57842 13.5 6.75C13.5 5.92158 12.8284 5.25 12 5.25Z" fill="#4D66EB"/>
                                    <path fillRule="evenodd" clipRule="evenodd" d="M12.0008 23.2008C18.1864 23.2008 23.2008 18.1864 23.2008 12.0008C23.2008 5.81519 18.1864 0.800781 12.0008 0.800781C5.81519 0.800781 0.800781 5.81519 0.800781 12.0008C0.800781 18.1864 5.81519 23.2008 12.0008 23.2008Z" stroke="#4D66EB" strokeWidth="1.5" strokeLinecap="round"/>
                                </svg>
                                <p className={styles.AlertNotOwnerText}>Please connect your wallet to use the app.</p>
                            </div>
                        )}
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
                                loading={loadingContractOwner}
                            />
                            {loadingContractOwner && validContract && isOwner == false && network == 1 && (
                                <svg className={styles.ContractSpinner} width="19" height="18" viewBox="0 0 19 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M17.5 9C17.5 11.2203 16.5955 13.2294 15.1348 14.6788C13.6888 16.1136 11.6979 17 9.5 17C5.08172 17 1.5 13.4183 1.5 9C1.5 4.58172 5.08172 1 9.5 1C13.31 1 16.498 3.66345 17.3035 7.23001" stroke="url(#paint0_angular_3739_24590)" strokeWidth="1.5" strokeLinecap="round"/>
                                        <defs>
                                            <radialGradient id="paint0_angular_3739_24590" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse"   gradientTransform="translate(9.5 9) rotate(-7.12502) scale(8.06226)">
                                                <stop stopOpacity="0"/>
                                                <stop offset="1"/>
                                            </radialGradient>
                                        </defs>
                                </svg>
                            )}
                            {validContract == false && inputContract != '' &&    
                                <span className={styles.AlertInvalid}>Invalid Contract address</span>
                            }
                        </div>
                        {!loadingContractOwner && validContract && isOwner == false && !invalidContract && (
                            <div className={styles.AlertNotOwner}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M10.3125 16.5H10.875V10.875H10.3125C10.0019 10.875 9.75 10.6231 9.75 10.3125V9.9375C9.75 9.62686 10.0019 9.375 10.3125 9.375H12.5625C12.8731 9.375 13.125 9.62686 13.125 9.9375V16.5H13.6875C13.9981 16.5 14.25 16.7519 14.25 17.0625V17.4375C14.25 17.7481 13.9981 18 13.6875 18H10.3125C10.0019 18 9.75 17.7481 9.75 17.4375V17.0625C9.75 16.7519 10.0019 16.5 10.3125 16.5ZM12 5.25C11.1716 5.25 10.5 5.92158 10.5 6.75C10.5 7.57842 11.1716 8.25 12 8.25C12.8284 8.25 13.5 7.57842 13.5 6.75C13.5 5.92158 12.8284 5.25 12 5.25Z" fill="#4D66EB"/>
                                    <path fillRule="evenodd" clipRule="evenodd" d="M12.0008 23.2008C18.1864 23.2008 23.2008 18.1864 23.2008 12.0008C23.2008 5.81519 18.1864 0.800781 12.0008 0.800781C5.81519 0.800781 0.800781 5.81519 0.800781 12.0008C0.800781 18.1864 5.81519 23.2008 12.0008 23.2008Z" stroke="#4D66EB" strokeWidth="1.5" strokeLinecap="round"/>
                                </svg>
                                <p className={styles.AlertNotOwnerText}>{`You don't own this collection`}</p>
                            </div>
                        )}
                        {!loadingContractOwner && validContract && isOwner && !invalidContract && (
                            <div className={styles.AlertNotOwnerRoyalties}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M10.3125 16.5H10.875V10.875H10.3125C10.0019 10.875 9.75 10.6231 9.75 10.3125V9.9375C9.75 9.62686 10.0019 9.375 10.3125 9.375H12.5625C12.8731 9.375 13.125 9.62686 13.125 9.9375V16.5H13.6875C13.9981 16.5 14.25 16.7519 14.25 17.0625V17.4375C14.25 17.7481 13.9981 18 13.6875 18H10.3125C10.0019 18 9.75 17.7481 9.75 17.4375V17.0625C9.75 16.7519 10.0019 16.5 10.3125 16.5ZM12 5.25C11.1716 5.25 10.5 5.92158 10.5 6.75C10.5 7.57842 11.1716 8.25 12 8.25C12.8284 8.25 13.5 7.57842 13.5 6.75C13.5 5.92158 12.8284 5.25 12 5.25Z" fill="#4D66EB"/>
                                    <path fillRule="evenodd" clipRule="evenodd" d="M12.0008 23.2008C18.1864 23.2008 23.2008 18.1864 23.2008 12.0008C23.2008 5.81519 18.1864 0.800781 12.0008 0.800781C5.81519 0.800781 0.800781 5.81519 0.800781 12.0008C0.800781 18.1864 5.81519 23.2008 12.0008 23.2008Z" stroke="#4D66EB" strokeWidth="1.5" strokeLinecap="round"/>
                                </svg>
                                <p className={styles.AlertNotOwnerTextRoyalties}>
                                    {currentRoyaltiesValue != 0 ? `A Royalty is already set for this collection: ${currentRoyaltiesValue}%` : `No current royalties for this collection`}
                                </p>
                            </div>
                        )}
                        {!loadingContractOwner && validContract && isOwner == false && network == 1 && invalidContract &&(
                            <div className={styles.AlertNotOwner}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M10.3125 16.5H10.875V10.875H10.3125C10.0019 10.875 9.75 10.6231 9.75 10.3125V9.9375C9.75 9.62686 10.0019 9.375 10.3125 9.375H12.5625C12.8731 9.375 13.125 9.62686 13.125 9.9375V16.5H13.6875C13.9981 16.5 14.25 16.7519 14.25 17.0625V17.4375C14.25 17.7481 13.9981 18 13.6875 18H10.3125C10.0019 18 9.75 17.7481 9.75 17.4375V17.0625C9.75 16.7519 10.0019 16.5 10.3125 16.5ZM12 5.25C11.1716 5.25 10.5 5.92158 10.5 6.75C10.5 7.57842 11.1716 8.25 12 8.25C12.8284 8.25 13.5 7.57842 13.5 6.75C13.5 5.92158 12.8284 5.25 12 5.25Z" fill="#4D66EB"/>
                                    <path fillRule="evenodd" clipRule="evenodd" d="M12.0008 23.2008C18.1864 23.2008 23.2008 18.1864 23.2008 12.0008C23.2008 5.81519 18.1864 0.800781 12.0008 0.800781C5.81519 0.800781 0.800781 5.81519 0.800781 12.0008C0.800781 18.1864 5.81519 23.2008 12.0008 23.2008Z" stroke="#4D66EB" strokeWidth="1.5" strokeLinecap="round"/>
                                </svg>
                                <p className={styles.AlertCantVerifyCode}>{`Can't find verified source code.`}</p>
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
                                {!validAddress && newReceiverAddr != '' && <span className={styles.AlertInvalidAddress}>Invalid address</span>}
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
                                    {newRoyaltyCut > 20 && <span className={styles.AlertInvalidAddress}>20% max.</span>}
                            </div>
                        </div>
                        {!loading && (    
                            <button 
                                disabled={isOwner != true || !newReceiverAddr || !newRoyaltyCut || newRoyaltyCut > 20 || !provider }
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
                    </form>
                </div>
                {!loading && txSuccess == true && (
                    <div className={styles.Backdrop}>
                    <div className={styles.TxSuccessBody}>
                        <Image src="/txSuccess.webp" alt="error" width={96} height={96} />
                        <h1 className={styles.TxSuccessTitle}><strong>Success</strong></h1>
                        <p className={styles.TxSuccessText}>Your royalty has been set successfully.</p>
                        <button className={styles.TxSuccessButton} onClick={toggle}>Close</button>
                        <div className={styles.closeButtonDiv}>
                                <Image className={styles.closeButton} onClick={toggle} src="/closeCross.png" alt="close" width={75} height={75}/>
                        </div>
                    </div>
                </div>
                )}
                {!loading && txError == true && (
                    <div className={styles.Backdrop}>
                        <div className={styles.TxSuccessBody}>
                            <Image src="/IllustrationError.png" alt="error" width={100} height={100} />
                            <h1 className={styles.TxSuccessTitle}><strong>Transaction failed!</strong></h1>
                            <p className={styles.TxSuccessText}>Please try again later.</p>
                            <button className={styles.TxSuccessButton} onClick={toggleError}>Close</button>
                            <div className={styles.closeButtonDiv}>
                                <Image className={styles.closeButton} onClick={toggleError} src="/closeCross.png" alt="close" width={75} height={75}/>
                            </div>
                        </div>
                    </div>
                )}  
            </main>

            <footer className={styles.footer}>

            </footer>
        </div>
    )
}
