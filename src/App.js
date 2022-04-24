import { useEffect, useState, useCallback } from "react";
import { Buffer } from "buffer";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { Program, Provider, web3 } from "@project-serum/anchor";
import idl from "./idl.json";
import kp from "./keypair.json";
import twitterLogo from "./assets/twitter-logo.svg";
import "./App.css";

window.Buffer = Buffer;
const { SystemProgram, Keypair } = web3;
const arr = Object.values(kp._keypair.secretKey);
const secret = new Uint8Array(arr);
const baseAccount = Keypair.fromSecretKey(secret);
const programId = new PublicKey(idl.metadata.address);
const network = clusterApiUrl("devnet");
const opts = {
  preflightCommitment: "processed",
};

// Constants
const TWITTER_HANDLE = "_buildspace";
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const App = () => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [gifList, setGifList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  function getProvider() {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(
      connection,
      window.solana,
      opts.preflightCommitment
    );
    return provider;
  }

  const getGifList = useCallback(async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programId, provider);
      const account = await program.account.baseAccount.fetch(
        baseAccount.publicKey
      );
      console.log("Got the account", account);
      setGifList(account.gifList);
      setIsLoading(false);
    } catch (error) {
      console.error("getGifList", error);
      setGifList(null);
    }
  }, []);

  useEffect(() => {
    if (walletAddress) {
      console.log("Fetching GIF list...");
      getGifList();
    }
  }, [walletAddress, getGifList]);

  useEffect(() => {
    const onload = async () => {
      await checkIfWalletIsConnected();
    };
    window.addEventListener("load", onload);
    return () => window.removeEventListener("load", onload);
  }, []);

  async function createGifAccount() {
    setIsLoading(true);
    try {
      const provider = getProvider();
      const program = new Program(idl, programId, provider);
     
      await program.rpc.startStuffOff({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount],
      });
      await getGifList();
    } catch (error) {
      setIsLoading(false);
      console.error("Error creating Gif account:", error);
    }
  }

  async function checkIfWalletIsConnected() {
    try {
      const { solana } = window;
      if (solana) {
        if (solana.isPhantom) {
          console.log("Phantom wallet found");
          const response = await solana.connect({ onlyIfTrusted: true });
          console.log(
            "Connected with Public Key:",
            response.publicKey.toString()
          );
          setWalletAddress(response.publicKey.toString());
        }
      } else {
        alert("Solana object not found! Get a Phantom wallet 👻");
      }
    } catch (error) {
      console.error("error", error);
    }
  }

  async function connectWallet() {
    const { solana } = window;

    if (solana) {
      const response = await solana.connect();
      console.log("Connected with Public Key:", response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
    }
  }

  function onInputChange(event) {
    const { value } = event.target;
    setInputValue(value);
  }

  async function sendGif() {
    setIsLoading(true);
    if (!!inputValue) {
      setInputValue("");
      try {
        const provider = getProvider();
        const program = new Program(idl, programId, provider);

        await program.rpc.addGif(inputValue, {
          accounts: {
            baseAccount: baseAccount.publicKey,
            user: provider.wallet.publicKey,
          },
        });

        await getGifList();
      } catch (error) {
        setIsLoading(false);
        console.error("sendGif", error);
      }
    }
  }

  const renderCreateAccount = () => (
    <button
      type="button"
      className="cta-button submit-gif-button"
      onClick={createGifAccount}
    >
      Do One-Time Initialization for GIF Program Account
    </button>
  );

  const renderFormInput = () => (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        sendGif();
      }}
    >
      <input
        type="text"
        placeholder="Enter gif link!"
        value={inputValue}
        onChange={onInputChange}
      />
      <button type="submit" className="cta-button submit-gif-button">
        Submit
      </button>
    </form>
  );

  const renderConnectedContainer = () => (
    <div className="connected-container">
      {gifList === null ? (
        renderCreateAccount()
      ) : (
        <>
          {renderFormInput()}
          <div className="gif-grid">
            {gifList.map((gif, index) => {
              return (
                <div className="gif-item" key={index}>
                  <img src={gif.gifLink} alt={gif.gifLink} />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="App">
      <div className={walletAddress ? "authed-container" : "container"}>
        <div className="header-container">
          {walletAddress ? (
            <div className="wallet">
              <p className="label">Wallet Address </p>
              <p className="address">{`${walletAddress?.substr(
                0,
                10
              )}...${walletAddress?.substr(-10, 10)}`}</p>
            </div>
          ) : null}
          <p className="header">🖼 GIF Portal</p>
          <p className="sub-text">
            View your GIF collection in the metaverse ✨
          </p>
          {!walletAddress ? (
            <button
              className="cta-button connect-wallet-button"
              onClick={connectWallet}
            >
              Connect to Wallet
            </button>
          ) : null}
          {walletAddress && isLoading ? (
            <span style={{ color: "white" }}>
              Processing transaction. Please wait...
            </span>
          ) : null}
        </div>
        {walletAddress ? renderConnectedContainer() : null}
      </div>
    </div>
  );
};

export default App;
