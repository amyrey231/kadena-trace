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
  };
}

interface CyberEdge {
  id: string;
  source: string;
  target: string;
  animated: boolean;
  style: { stroke: string };
}

interface KadenaTx {
  amount: number | string;
  senderAccount: string;
  receiverAccount: string;
  creationTime: string;
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
      // --- KADENA LOGIC ---
      const KADENA_SURVIVOR_NODE = `https://api.chainweb.com/chainweb/0.0/mainnet01/chain/0/pact/api/v1/local`;
      
      const response = await fetch(KADENA_SURVIVOR_NODE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'KadenaTrace-Enterprise' },
        body: JSON.stringify({
          cmds: [{ hash: "trace", sigs: [], cmd: `(coin.details "${wallet}")` }] 
        })
      });

      if (!response.ok) throw new Error(`Community Node Unreachable: ${response.status}`);

      const rawData = await response.json();
      const data: KadenaTx[] = rawData?.result?.data || [];

      if (data.length >= 2) {
        const times = data.map((tx) => new Date(tx.creationTime).getTime()); 
        const timeDiff = Math.abs(times[0] - times[data.length - 1]);
        if (data.length > 5 && timeDiff < 3600000) { 
          behavioralRisk = 'critical';
          riskFlags.push("High-Velocity Asset Sweeping (Cross-Chain Drainer)");
        }
      }

      const totalKdaVolume = data.reduce((acc, tx) => acc + (Number(tx.amount) || 0), 0).toFixed(2);

      nodes.push({
        id: rootId, type: 'cyber', position: { x: 50, y: 250 },
        data: { 
          role: 'Kadena Target', address: wallet, risk: behavioralRisk, 
          flags: riskFlags, txCount: data.length, volume: totalKdaVolume, firstSeen: 'Community Node'
        }
      });

      data.slice(0, 10).forEach((tx, index) => {
        const interacted = tx.senderAccount?.toLowerCase() === rootId ? tx.receiverAccount?.toLowerCase() : tx.senderAccount?.toLowerCase();
        if (interacted && interacted !== rootId) {
          const col = Math.floor(index / 4);
          const row = index % 4;
          nodes.push({
            id: interacted, type: 'cyber', position: { x: 450 + (col * 350), y: 100 + (row * 150) },
            data: { role: 'KDA Interaction', address: interacted, risk: behavioralRisk === 'critical' ? 'critical' : 'warning', volume: `${tx.amount}` }
          });
          edges.push({ id: `e-k-${index}`, source: rootId, target: interacted, animated: behavioralRisk === 'critical', style: { stroke: behavioralRisk === 'critical' ? '#ff0044' : '#ef4444' } });
        }
      });

    } else {
      // --- ETHEREUM LOGIC ---
      const ETHERSCAN_API_KEY = "ZHS5IHVF2PG67MFMZ238KAF6GYXFM5IEX7";

      // 1. Fetch TOTAL transaction count from the blockchain proxy
      const countUrl = `https://api.etherscan.io/v2/api?chainid=1&module=proxy&action=eth_getTransactionCount&address=${wallet}&tag=latest&apikey=${ETHERSCAN_API_KEY}`;
      const countRes = await fetch(countUrl);
      const countData = await countRes.json();
      
      // REINFORCED HEX CONVERSION: Etherscan returns hex (e.g., "0x539")
      const hexCount = countData.result;
      const totalTransactions = typeof hexCount === 'string' && hexCount.startsWith('0x') 
        ? parseInt(hexCount, 16) 
        : 0;

      // 2. Fetch recent transaction list for behavioral analysis and mapping
      const url = `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address=${wallet}&startblock=0&endblock=99999999&page=1&offset=20&sort=desc&apikey=${ETHERSCAN_API_KEY}`;
      const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const rawData = await response.json();

      if (rawData.status === "1" && Array.isArray(rawData.result)) {
        const txs: EthTx[] = rawData.result;
        const totalVolume = txs.reduce((acc, tx) => acc + (Number(tx.value) / 1e18), 0).toFixed(4);

        const knownSafeEntities = [
          "0x28c6c06298d514db089934071355e5743bf21d60", "0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be",
          "0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae", "0x000000000000000000000000000000000000dead",
          "0x0000000000000000000000000000000000000000"
        ];

        if (knownSafeEntities.includes(rootId)) {
            behavioralRisk = 'safe';
            riskFlags.push("Verified Safe Entity (Behavioral Checks Bypassed)");
        } else {
            // Behavioral Checks
            const firstTx = txs[0];
            const secondTx = txs[1];
            if (firstTx && secondTx) {
                if (firstTx.from.toLowerCase() === rootId && secondTx.to.toLowerCase() === rootId && Number(secondTx.value) < 50000000000000000) { 
                    behavioralRisk = 'critical';
                    riskFlags.push("Flash Gas Siphoning (Compromise Signature)");
                }
            }
            if (txs.length >= 5) {
                const burst = txs.slice(0, 5);
                const burstTime = Math.abs(Number(burst[0].timeStamp) - Number(burst[4].timeStamp));
                if (burstTime < 300) { 
                    behavioralRisk = 'critical';
                    riskFlags.push("Rapid Asset Sweep (Drainer Behavior)");
                }
            }
            const incomingTxs = txs.filter((tx) => tx.to?.toLowerCase() === rootId);
            const uniqueSenders = new Set(incomingTxs.map((tx) => tx.from?.toLowerCase())).size;
            if (incomingTxs.length >= 8 && uniqueSenders >= 5) {
                behavioralRisk = 'critical';
                riskFlags.push("Anomalous Accumulation (Phishing/Scam Hub Signature)");
            }
        }

        nodes.push({
          id: rootId, type: 'cyber', position: { x: 50, y: 250 },
          data: { 
            role: 'Ethereum Target', address: wallet, risk: behavioralRisk, 
            flags: riskFlags, txCount: totalTransactions, volume: totalVolume, firstSeen: 'Mainnet'
          }
        });

        txs.slice(0, 12).forEach((tx, index) => {
          const interacted = tx.to?.toLowerCase() === rootId ? tx.from?.toLowerCase() : tx.to?.toLowerCase();
          if (interacted) {
            const col = Math.floor(index / 4);
            const row = index % 4;
            nodes.push({
              id: interacted, type: 'cyber', position: { x: 450 + (col * 350), y: 100 + (row * 150) },
              data: { role: 'Node', address: interacted, risk: behavioralRisk === 'critical' ? 'critical' : 'warning', volume: `${(Number(tx.value) / 1e18).toFixed(4)}` }
            });
            edges.push({ id: `e-eth-${tx.hash}`, source: rootId, target: interacted, animated: true, style: { stroke: behavioralRisk === 'critical' ? '#ff0044' : '#f59e0b' } });
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