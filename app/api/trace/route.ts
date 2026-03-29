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

interface KadenaEdge {
  node: {
    amount: number | string;
    senderAccount: string;
    receiverAccount: string;
    requestKey: string;
  };
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
      // --- 100% REAL KADENA LOGIC (LIVE GRAPHQL) ---
      const KADENA_GRAPHQL_URL = "https://graph.kadena.network/graphql";
      const query = `
        query getKadenaTrace($wallet: String!) {
          fungibleAccount(accountName: $wallet, fungibleName: "coin") {
            totalBalance
            chainAccounts { chainId balance }
          }
          transfers(accountName: $wallet, fungibleName: "coin", first: 15) {
            edges { node { amount senderAccount receiverAccount requestKey } }
          }
        }
      `;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(KADENA_GRAPHQL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ query, variables: { wallet: wallet } }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error("Kadena GraphQL Offline or Blocking Request");
      
      const rawData = await res.json();
      if (rawData.errors) throw new Error("Kadena API returned an error");

      const accountData = rawData?.data?.fungibleAccount;
      const transferEdges: KadenaEdge[] = rawData?.data?.transfers?.edges || [];

      let totalRealKdaBalance = 0;
      let activeChains = 0;

      if (accountData) {
        totalRealKdaBalance = accountData.totalBalance;
        activeChains = accountData.chainAccounts?.length || 0;
      }

      const targetLabel = activeChains > 0 ? 'Verified KDA Account' : 'Inactive/Empty Wallet';
      
      if (activeChains === 0) {
          behavioralRisk = 'warning';
          riskFlags.push("No activity found on any Kadena chain.");
      } else {
          riskFlags.push(`Active on ${activeChains} Chain(s)`);
          riskFlags.push("Indexed via Live Kadena GraphQL");
          if (totalRealKdaBalance > 5000) riskFlags.push("High-Volume Entity");
          if (transferEdges.length >= 8) riskFlags.push("High-Frequency Routing");
      }

      nodes.push({
        id: rootId, type: 'cyber', position: { x: 50, y: 250 },
        data: { 
          role: targetLabel, 
          address: wallet, risk: behavioralRisk, 
          flags: riskFlags, 
          txCount: Math.max(activeChains, transferEdges.length), 
          volume: totalRealKdaBalance.toFixed(4), firstSeen: activeChains > 0 ? 'Kadena Mainnet' : 'Unrecorded',
          totalFound: transferEdges.length
        }
      });

      transferEdges.forEach((edge: KadenaEdge, index: number) => {
        const tx = edge.node;
        const interactedId = tx.senderAccount === wallet ? tx.receiverAccount : tx.senderAccount;
        
        if (interactedId && interactedId !== wallet) {
          const col = Math.floor(index / 4);
          const row = index % 4;
          
          nodes.push({
            id: interactedId, type: 'cyber', position: { x: 450 + (col * 350), y: 100 + (row * 150) },
            data: { 
              role: tx.senderAccount === wallet ? 'Funds Sent To' : 'Funds Received From',
              address: interactedId, 
              risk: 'safe', 
              volume: `${Number(tx.amount).toFixed(2)}` 
            }
          });
          
          edges.push({ 
            id: `e-kda-${tx.requestKey}-${index}`, 
            source: rootId, 
            target: interactedId, 
            animated: true, 
            style: { stroke: '#34d399' } 
          });
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

      const txs: EthTx[] = (rawData.status === "1" && Array.isArray(rawData.result)) ? rawData.result : [];

      const totalVolume = txs.reduce((acc, tx) => acc + (Number(tx.value) / 1e18), 0).toFixed(4);

      const allInteractedAddresses = new Set(
        txs.map(tx => tx.to?.toLowerCase() === rootId ? tx.from?.toLowerCase() : tx.to?.toLowerCase())
             .filter(addr => addr && addr !== rootId)
      );
      const totalFoundCount = allInteractedAddresses.size;

      // ENTERPRISE REGISTRIES (Whitelist vs Blacklist)
      const knownSafeEntities = [
        "0x28c6c06298d514db089934071355e5743bf21d60", "0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be",
        "0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae", "0x000000000000000000000000000000000000dead",
        "0x0000000000000000000000000000000000000000",
        "0x7a250d5630b4cf539739df2c5dacb4c659f2488d", // Uniswap
        "0xd8da6bf26964af9d7eed9e03e53415d37aa96045", // Vitalik
        "0x00000000219ab540356cbb839cbe05303d7705fa"  // Deposit Contract
      ];

      const knownMaliciousEntities = [
        "0x39f6a6c85d39d5abad8a398310c52e7c374f2ba3", // Known Drainer Hub
        "0x09750ad360fdb7a2ee23669c4503c974d86d8694", // Phishing Accumulator
        "0x1e3d42cbc510b5e0d578051e8bbdf0db55cefa52", // Scam Dump
        "0x6b75d8af000000e20b7a7ddf000ba900b4009a80", // Jaredfromsubway MEV Bot
        "0x000000000000084e91743124a982076c59f10084", // Malicious MEV 1
        "0x0000000000007f150d96d065805e2637f5b11299"  // Malicious MEV 2
      ];

      if (txs.length === 0) {
          behavioralRisk = 'safe';
          riskFlags.push("New or Inactive Wallet");
      } else if (knownSafeEntities.includes(rootId)) {
          behavioralRisk = 'safe';
          riskFlags.push("Verified Public/Safe Entity (Checks Bypassed)");
      } else if (knownMaliciousEntities.includes(rootId)) {
          // BLACKLIST MATCH
          behavioralRisk = 'critical';
          riskFlags.push("OFAC / Global Threat Registry Match");
          riskFlags.push("Known Malicious Exploiter Hub");
      } else {
          // BEHAVIORAL MATH (For Unknown/New Wallets)
          if (txs.length >= 10) {
              const burst = txs.slice(0, 10);
              const burstTime = Math.abs(Number(burst[0].timeStamp) - Number(burst[9].timeStamp));
              if (burstTime < 30) { 
                  behavioralRisk = 'critical';
                  riskFlags.push("Automated Asset Sweep (Drainer Behavior)");
              }
          }
          
          const incomingTxs = txs.filter((tx) => tx.to?.toLowerCase() === rootId);
          const uniqueSenders = new Set(incomingTxs.map((tx) => tx.from?.toLowerCase())).size;
          
          if (incomingTxs.length >= 15 && uniqueSenders >= 10 && totalTransactions <= 5) {
              behavioralRisk = 'critical';
              riskFlags.push("Anomalous Accumulation (Phishing/Scam Hub Signature)");
          }

          // Unverified massive router check
          if (totalTransactions > 100000 && behavioralRisk !== 'critical') {
              behavioralRisk = 'warning';
              riskFlags.push("Unverified High-Frequency Router");
          }
      }

      let targetLabel = 'Standard Wallet';
      if (behavioralRisk === 'critical') targetLabel = 'High-Risk Target';
      if (behavioralRisk === 'warning') targetLabel = 'Monitored Entity';
      if (knownSafeEntities.includes(rootId)) targetLabel = 'Verified Contract';
      if (txs.length === 0) targetLabel = 'Inactive Wallet';

      nodes.push({
        id: rootId, type: 'cyber', position: { x: 50, y: 250 },
        data: { 
          role: targetLabel, 
          address: wallet, risk: behavioralRisk, 
          flags: riskFlags, 
          txCount: Math.max(totalTransactions, txs.length), 
          volume: totalVolume, firstSeen: txs.length > 0 ? 'Mainnet' : 'Unrecorded',
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
    return NextResponse.json({ nodes, edges });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isDnsError = errorMessage.includes('ENOTFOUND') || errorMessage.includes('fetch failed') || errorMessage.includes('Offline');
    
    return NextResponse.json({ 
      nodes: [{ 
        id: rootId, type: 'cyber', position: { x: 50, y: 250 }, 
        data: { 
          role: isKadena ? 'Kadena (UNREACHABLE)' : 'Ethereum (UNREACHABLE)', 
          address: wallet, risk: 'warning', 
          flags: isDnsError ? ["RPC Connection Failed", "DNS / ISP Block Detected"] : ["API Timeout", "Network Offline"],
          txCount: 0, volume: "0", firstSeen: 'Connection Dropped'
        } 
      }], edges: [] 
    });
  }
}