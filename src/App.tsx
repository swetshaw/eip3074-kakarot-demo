import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Heading,
  Text,
  VStack,
  Image,
  useToast,
  Flex,
  Spacer,
  Spinner,
  Center,
  Input,
} from "@chakra-ui/react";
import { ethers } from "ethers";
import kkrt from "./kkrt.jpg";
import "./App.css";
import gasSponsorArtifact from "./abis/GasSponsorInvoker.json";
import tokenArtifact from "./abis/ERC20.json";

function App() {
  const [connected, setConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");

  const [connectedWalletTokenBalance, setConnectedWalletTokenBalance] =
    useState(""); // State to store the connected wallet's token balance

  const [loading, setLoading] = useState(false); // State to manage loading state

  const [authorityAddress, setAuthorityAddress] = useState(""); // State to store the authority's address
  const [authorityBalanceBefore, setAuthorityBalanceBefore] = useState(""); // State to store the authority's balance before the transfer
  const [receiverBalanceBefore, setReceiverBalanceBefore] = useState("0"); // State to store the receiver's balance before the transfer
  const [authorityBalance, setAuthorityBalance] = useState("");
  const [receiverBalance, setReceiverBalance] = useState("0");
  const [receiverAddress, setReceiverAddress] = useState("");
  const [transferAmount, setTransferAmount] = useState("0");
  const [invokeSuccessful, setInvokeSuccessful] = useState(false);

  const [signature, setSignature] = useState(""); // State to store the signature of the authority
  const toast = useToast();

  const GAS_SPONSOR_INVOKER_CONTRACT_ADDRESS =
    process.env.REACT_APP_GAS_SPONSOR_INVOKER_CONTRACT_ADDRESS;
  const TOKEN_CONTRACT_ADDRESS = process.env.REACT_APP_TOKEN_CONTRACT_ADDRESS;
  const KAKAROT_RPC_URL = process.env.REACT_APP_KAKAROT_RPC_URL;

  const provider = new ethers.JsonRpcProvider(KAKAROT_RPC_URL!);

  const tokenContract = new ethers.Contract(
    TOKEN_CONTRACT_ADDRESS!,
    tokenArtifact.abi,
    provider,
  );

  // Function to connect to the wallet
  async function connectWallet() {
    if (!connected) {
      try {
        // @ts-ignore
        const { ethereum } = window;
        if (ethereum && ethereum.isMetaMask) {
          // Request account access
          await ethereum.request({ method: "eth_requestAccounts" });
          const provider = new ethers.BrowserProvider(ethereum);
          const signer = await provider.getSigner();
          const _walletAddress = await signer.getAddress();
          const tokenBalance = await tokenContract.balanceOf(_walletAddress);
          setConnectedWalletTokenBalance(
            Number(ethers.formatEther(tokenBalance)).toFixed(0),
          );
          setConnected(true);
          setWalletAddress(_walletAddress);
          toast({
            title: "Wallet connected.",
            description: `Address: ${_walletAddress}`,
            status: "success",
            duration: 1000,
            isClosable: true,
          });
        } else {
          // MetaMask is not installed
          toast({
            title: "Error",
            description: "Please install MetaMask!",
            status: "error",
            duration: 1000,
            isClosable: true,
          });
        }
      } catch (error) {
        console.error("Error connecting to MetaMask", error);
      }
    } else {
      setConnected(false);
      setWalletAddress("");
      toast({
        title: "Disconnected",
        description: "The wallet has been disconnected.",
        status: "info",
        duration: 3000,
        isClosable: true,
      });
    }
  }

  async function disconnectWallet() {
    // @ts-ignore
    setConnected(false);
    setWalletAddress("");
  }

  async function Authorise() {
    // @ts-ignore
    const { ethereum } = window;
    const provider = new ethers.BrowserProvider(ethereum);
    const signer = await provider.getSigner();

    setAuthorityAddress(signer.address);

    const authorityBalance = await tokenContract.balanceOf(signer.address);
    setAuthorityBalanceBefore(
      Number(ethers.formatEther(authorityBalance)).toFixed(0),
    );

    const receiverBalance = await tokenContract.balanceOf(receiverAddress);
    setReceiverBalanceBefore(
      Number(ethers.formatEther(receiverBalance)).toFixed(0),
    );

    const gasSponsorContract = new ethers.Contract(
      GAS_SPONSOR_INVOKER_CONTRACT_ADDRESS!,
      gasSponsorArtifact.abi,
      signer,
    );

    const nonce = await provider.getTransactionCount(signer.address);
    const commit = "newCommit";
    const encodedCommit = ethers.encodeBytes32String(commit);
    const digest = await gasSponsorContract.getDigest(encodedCommit, nonce);

    const signature = await ethereum.request({
      method: "eth_sign",
      params: [signer.address, digest],
    });
    setSignature(signature);
    disconnectWallet();
  }

  async function invokeTransfer() {
    setLoading(true);
    // @ts-ignore
    const { ethereum } = window;
    const provider = new ethers.BrowserProvider(ethereum);
    const signer = await provider.getSigner();

    const gasSponsorContract = new ethers.Contract(
      GAS_SPONSOR_INVOKER_CONTRACT_ADDRESS!,
      gasSponsorArtifact.abi,
      signer,
    );

    const tokenContract = new ethers.Contract(
      TOKEN_CONTRACT_ADDRESS!,
      tokenArtifact.abi,
      signer,
    );

    const commit = "newCommit";
    const encodedCommit = ethers.encodeBytes32String(commit);

    const { v, r, s } = ethers.Signature.from(signature);

    const transferCalldata = tokenContract?.interface.encodeFunctionData(
      "transfer",
      [receiverAddress, ethers.parseEther(transferAmount)],
    );

    try {
      const tx = await gasSponsorContract.sponsorCall(
        authorityAddress,
        encodedCommit,
        v,
        r,
        s,
        TOKEN_CONTRACT_ADDRESS,
        transferCalldata,
        {
          gasLimit: 142110,
        },
      );

      console.log("Tx", tx);

      const receipt = await tx.wait();
      console.log("Tx receipt", receipt);

      setInvokeSuccessful(true);
      setLoading(false);

      const updatedAuthorityBalance =
        await tokenContract.balanceOf(authorityAddress);
      const updatedReceiverBalance =
        await tokenContract.balanceOf(receiverAddress);
      setAuthorityBalance(
        Number(ethers.formatEther(updatedAuthorityBalance)).toFixed(0),
      );
      setReceiverBalance(
        Number(ethers.formatEther(updatedReceiverBalance)).toFixed(0),
      );
    } catch (error) {
      console.error("Error invoking gas sponsor:", error);
      setLoading(false);
    }
  }

  async function mintTokens() {
    try {
      // @ts-ignore
      const { ethereum } = window;
      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      const tokenContract = new ethers.Contract(
        TOKEN_CONTRACT_ADDRESS!,
        tokenArtifact.abi,
        signer,
      );

      const tx = await tokenContract.mint(
        signer.address,
        ethers.parseEther("100"),
      );
      console.log("Tx:", tx);
      const receipt = await tx.wait();
      console.log("Receipt:", receipt);

      toast({
        title: "Tokens minted successfully.",
        description: `100 KKRT tokens have been minted to your address.`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error("Error minting tokens:", error);
      toast({
        title: "Error",
        description: "Error minting tokens.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  }

  function reset() {
    setReceiverAddress("");
    setTransferAmount("0");
    setReceiverBalance("0");
    setSignature("");
    setInvokeSuccessful(false);
  }

  useEffect(() => {
    async function fetchBalances() {
      if (authorityAddress) {
        const authorityBalance =
          await tokenContract.balanceOf(authorityAddress);
        setAuthorityBalance(
          Number(ethers.formatEther(authorityBalance)).toFixed(0),
        );
      }
      if (receiverAddress) {
        const receiverBalance = await tokenContract.balanceOf(receiverAddress);
        setReceiverBalance(
          Number(ethers.formatEther(receiverBalance)).toFixed(0),
        );
      }
    }

    fetchBalances();
  }, [connected, receiverAddress, invokeSuccessful]);

  return (
    <Center minH="100vh" bg="gray.100" display="flex" flexDirection="column">
      <Box p={8} w="80%" bg="white" boxShadow="xl" borderRadius="lg">
        <Flex>
          <Heading as="h1" size="2xl">
            Kakarot EIP3074 Demo
          </Heading>
          <Spacer />
          <Button colorScheme="blue" onClick={connectWallet}>
            {connected ? "Disconnect"
              : !signature
                ? "Connect Authority Wallet"
                : "Connect Sponsor Wallet"
            }
          </Button>
        </Flex>
        <Flex justify="space-between" align="center" mt="4">
          <VStack spacing={4} align="flex-start">
            <Text fontSize="lg">
              {connected ? (
                <>
                  <Text fontSize="lg">
                    <b>Connected Address:</b> {walletAddress}
                  </Text>
                  <Text fontSize="lg">
                    <b>Balance: {connectedWalletTokenBalance} KKRT </b>
                  </Text>
                </>
              ) : (
                "No Wallet Connected"
              )}
            </Text>

            {signature ? null : (
              <>
                <label>Receiver Address</label>
                <Input
                  placeholder="Receiver Address"
                  value={receiverAddress}
                  onChange={(e) => setReceiverAddress(e.target.value)}
                />
                <label>Transfer Amount</label>
                <Input
                  placeholder="Transfer Amount"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                />
              </>
            )}
            {loading ? (
              <Flex align="center">
                <Spinner size="md" mr="4" />
                <Text>Processing Transaction...</Text>
              </Flex>
            ) : null}

            {signature ? (
              <>
                <Text fontSize="lg">
                  <b>Authority has signed the digest ✅</b>
                </Text>
                <Text fontSize="lg">
                  <b>Connect the Sponsor Wallet to invoke the transaction</b>
                </Text>
                <Text fontSize="lg">
                  <b>Signature:</b> {signature.substring(0, 10)}...
                  {signature.substring(signature.length - 10, signature.length)}
                </Text>
              </>
            ) : null}

            {!(receiverAddress && signature) ? (
              <>
                <Text fontSize="lg">
                  <b>Receiver Address:</b> {receiverAddress}
                </Text>
                <Text fontSize="lg">
                  <b>Receiver Balance: {receiverBalance} KKRT </b>
                </Text>
              </>
            ) : null}
            {!signature ? (
              <Button colorScheme="orange" onClick={Authorise} mt="4">
                Sign transfer with EIP3074
              </Button>
            ) : (
              <Button
                colorScheme="messenger"
                onClick={invokeTransfer}
                mt="4"
                isDisabled={!connected}
              >
                Invoke Transaction
              </Button>
            )}

            {invokeSuccessful ? (
              <>
                <Text fontSize="lg">
                  <b>Transaction Successful ✅</b>
                </Text>
                <Text fontSize="lg">
                  <b>Authority Balance: {authorityBalance} KKRT </b> (Before{" "}
                  {authorityBalanceBefore}){" "}
                </Text>
                <Text fontSize="lg">
                  <b>Receiver Balance: {receiverBalance} KKRT </b> (Before{" "}
                  {receiverBalanceBefore}){" "}
                </Text>
                <Button colorScheme="blue" onClick={reset} mt="4">
                  Reset
                </Button>
              </>
            ) : null}
          </VStack>
          <Image src={kkrt} boxSize="300px" alt="Kakarot" objectFit="contain" />
        </Flex>
      </Box>
      <Text fontSize="lg" mt="4">
        Don't have any KKRT tokens? Click on the button below to mint 100
        tokens.
      </Text>
      <Text fontSize="medium" mt="2">
        Please make sure your wallet is connected to Kakarot Sepolia Network
      </Text>
      <Button colorScheme="green" onClick={mintTokens} mt="4">
        Mint 100 KKRT Tokens to the Authority Wallet
      </Button>
    </Center>
  );
}

export default App;
