import { NextResponse } from 'next/server';

// --- 1. STRICT TYPESCRIPT INTERFACES ---
interface CyberNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    role: string;
    address: string;
    risk: string;
    flags?: string[];
    txCount?: number;
    volume: string;
    firstSeen?: string;
    totalFound?: number; 
  };
}

interface CyberEdge {
  id: string;
  source: string;
  target: string;
  animated: boolean;
  style: { stroke: string };
}

interface EthTx {
  value: string;
  timeStamp: string;
  from: string;
  to: string;
  hash: string;
}

// --- 2. MAIN API ROUTE ---
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get('wallet');

  if (!wallet) return NextResponse.json({ error: "No wallet" }, { status: 400 });

  const isKadena = wallet.startsWith('k:');
  const rootId = wallet.toLowerCase();
  
  const nodes: CyberNode[] = [];
  const edges: CyberEdge[] = [];
  
  let behavioralRisk = 'safe';
  const riskFlags: string[] = [];

  try {
    if (isKadena) {
      // --- REAL KADENA LOGIC (LIVE MULTI-SHARD DATA) ---
      // Kadena has 20 chains. We execute 20 parallel live smart contract calls
      // to `coin.details` to aggregate the absolute true real-time balance of this account.
      const chainsToQuery = Array.from({length: 20}, (_, i) => i.toString());
      let totalRealKdaBalance = 0;
      let activeChains = 0;

      await Promise.all(chainsToQuery.map(async (chain) => {
        try {
          const KADENA_NODE = `https://api.chainweb.com/chainweb/0.0/mainnet01/chain/${chain}/pact/api/v1/local`;
          
          // Constructing the exact payload required to query a Kadena Smart Contract locally
          const cmdPayload = {
            networkId: "mainnet01",
            payload: { exec: { data: {}, code: `(coin.details "${wallet}")` } },
            signers: [],
            meta: {
              creationTime: Math.floor(Date.now() / 1000),
              ttl: 28800, gasLimit: 100000, chainId: chain, gasPrice: 1e-8, sender: ""
            },
            nonce: `trace-${Date.now()}`
          };

          const res = await fetch(KADENA_NODE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cmd: JSON.stringify(cmdPayload), hash: "trace-hash", sigs: [] })
          });

          if (res.ok) {
            const rawData = await res.json();
            // A successful account check returns status "success" and data with a balance
            if (rawData?.result?.status === "success" && rawData?.result?.data?.balance) {
              totalRealKdaBalance += Number(rawData.result.data.balance);
              activeChains++;
            }
          }
        } catch (e) {
          // Silent catch to prevent one slow chain from breaking the Promise.all
        }
      }));

      const targetLabel = activeChains > 0 ? 'Verified KDA Account' : 'Inactive/Empty Wallet';
      if (activeChains === 0) {
          behavioralRisk = 'warning';
          riskFlags.push("No activity found on any of the 20 Kadena chains.");
      } else {
          riskFlags.push(`Active on ${activeChains} Chain(s)`);
          riskFlags.push("Live Pact Smart Contract Data");
      }

      nodes.push({
        id: rootId, type: 'cyber', position: { x: 50, y: 250 },
        data: { 
          role: targetLabel, 
          address: wallet, risk: behavioralRisk, 
          flags: riskFlags, 
          txCount: activeChains, // Using active chains as a UI proxy 
          volume: totalRealKdaBalance.toFixed(4), firstSeen: 'Kadena Mainnet',
          totalFound: 0 // Real historical connections require a GraphQL Indexer
        }
      });

    } else {
      // --- REAL ETHEREUM LOGIC (LIVE BLOCKCHAIN DATA) ---
      const ETHERSCAN_API_KEY = "ZHS5IHVF2PG67MFMZ238KAF6GYXFM5IEX7";

      const countUrl = `https://api.etherscan.io/v2/api?chainid=1&module=proxy&action=eth_getTransactionCount&address=${wallet}&tag=latest&apikey=${ETHERSCAN_API_KEY}`;
      const countRes = await fetch(countUrl);
      const countData = await countRes.json();
      
      const hexCount = countData.result;
      const totalTransactions = typeof hexCount === 'string' && hexCount.startsWith('0x') ? parseInt(hexCount, 16) : 0;

      const url = `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address=${wallet}&startblock=0&endblock=99999999&page=1&offset=100&sort=desc&apikey=${ETHERSCAN_API_KEY}`;
      const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const rawData = await response.json();

      if (rawData.status === "1" && Array.isArray(rawData.result)) {
        const txs: EthTx[] = rawData.result;
        const totalVolume = txs.reduce((acc, tx) => acc + (Number(tx.value) / 1e18), 0).toFixed(4);

        const allInteractedAddresses = new Set(
          txs.map(tx => tx.to?.toLowerCase() === rootId ? tx.from?.toLowerCase() : tx.to?.toLowerCase())
             .filter(addr => addr && addr !== rootId)
        );
        const totalFoundCount = allInteractedAddresses.size;

        const knownSafeEntities = [
          "0x28c6c06298d514db089934071355e5743bf21d60", "0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be",
          "0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae", "0x000000000000000000000000000000000000dead",
          "0x0000000000000000000000000000000000000000",
          "0x7a250d5630b4cf539739df2c5dacb4c659f2488d", // Uniswap
          "0xd8da6bf26964af9d7eed9e03e53415d37aa96045", // Vitalik
          "0x00000000219ab540356cbb839cbe05303d7705fa"  // Deposit Contract
        ];

        if (knownSafeEntities.includes(rootId)) {
            behavioralRisk = 'safe';
            riskFlags.push("Verified Public/Safe Entity (Checks Bypassed)");
        } else {
            const firstTx = txs[0];
            const secondTx = txs[1];
            
            if (firstTx && secondTx) {
                if (firstTx.from.toLowerCase() === rootId && secondTx.to.toLowerCase() === rootId && Number(secondTx.value) < 1000000000000000) { 
                    behavioralRisk = 'critical';
                    riskFlags.push("Flash Gas Siphoning (Compromise Signature)");
                }
            }
            
            if (txs.length >= 10) {
                const burst = txs.slice(0, 10);
                const burstTime = Math.abs(Number(burst[0].timeStamp) - Number(burst[9].timeStamp));
                if (burstTime < 60) { 
                    behavioralRisk = 'critical';
                    riskFlags.push("Automated Asset Sweep (Drainer Behavior)");
                }
            }
            
            const incomingTxs = txs.filter((tx) => tx.to?.toLowerCase() === rootId);
            const uniqueSenders = new Set(incomingTxs.map((tx) => tx.from?.toLowerCase())).size;
            
            if (incomingTxs.length >= 15 && uniqueSenders >= 10 && totalTransactions < 20) {
                behavioralRisk = 'critical';
                riskFlags.push("Anomalous Accumulation (Phishing/Scam Hub Signature)");
            }
        }

        let targetLabel = 'Standard Wallet';
        if (behavioralRisk === 'critical') targetLabel = 'High-Risk Target';
        if (behavioralRisk === 'warning') targetLabel = 'Monitored Entity';
        if (knownSafeEntities.includes(rootId)) targetLabel = 'Verified Contract';

        nodes.push({
          id: rootId, type: 'cyber', position: { x: 50, y: 250 },
          data: { 
            role: targetLabel, 
            address: wallet, risk: behavioralRisk, 
            flags: riskFlags, 
            txCount: Math.max(totalTransactions, txs.length), 
            volume: totalVolume, firstSeen: 'Mainnet',
            totalFound: totalFoundCount 
          }
        });

        txs.slice(0, 12).forEach((tx, index) => {
          const interacted = tx.to?.toLowerCase() === rootId ? tx.from?.toLowerCase() : tx.to?.toLowerCase();
          if (interacted) {
            const col = Math.floor(index / 4);
            const row = index % 4;
            nodes.push({
              id: interacted, type: 'cyber', position: { x: 450 + (col * 350), y: 100 + (row * 150) },
              data: { 
                role: 'Connected Wallet',
                address: interacted, 
                risk: behavioralRisk === 'critical' ? 'warning' : 'safe', 
                volume: `${(Number(tx.value) / 1e18).toFixed(4)}` 
              }
            });
            edges.push({ 
              id: `e-eth-${tx.hash}`, 
              source: rootId, 
              target: interacted, 
              animated: true, 
              style: { stroke: behavioralRisk === 'critical' ? '#ff0044' : '#34d399' } 
            });
          }
        });
      }
    }
    return NextResponse.json({ nodes, edges });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isDnsError = errorMessage.includes('ENOTFOUND') || errorMessage.includes('fetch failed');
    return NextResponse.json({ 
      nodes: [{ 
        id: rootId, type: 'cyber', position: { x: 50, y: 250 }, 
        data: { 
          role: isKadena ? 'Kadena (UNREACHABLE)' : 'Ethereum (UNREACHABLE)', 
          address: wallet, risk: 'warning', 
          flags: isDnsError ? ["RPC Connection Failed", "DNS / ISP Block Detected"] : ["API Timeout"],
          txCount: 0, volume: "0", firstSeen: 'Network Offline'
        } 
      }], edges: [] 
    });
  }
}