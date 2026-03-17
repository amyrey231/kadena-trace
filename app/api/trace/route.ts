import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get('wallet');

  if (!wallet) return NextResponse.json({ error: "No wallet" }, { status: 400 });

  const isKadena = wallet.startsWith('k:');
  const rootId = wallet.toLowerCase();
  let nodes: any[] = [];
  let edges: any[] = [];

  try {
    if (isKadena) {
      // --- REAL KADENA TRACE ---
      const kdaUrl = `https://estats.chainweb.com/mainnet/chain/0/address/${wallet}/txs?limit=10`;
      
      // We add a generic browser header to prevent blocks
      const response = await fetch(kdaUrl, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
      });
      
      if (!response.ok) throw new Error(`Kadena API blocked request: ${response.status}`);
      const data = await response.json();

      nodes.push({
        id: rootId, type: 'cyber', position: { x: 50, y: 250 },
        data: { role: 'Kadena Target', address: wallet, risk: 'safe', volume: '0', firstSeen: 'Chainweb', txCount: data.length || 0 }
      });

      if (Array.isArray(data) && data.length > 0) {
        data.forEach((tx: any, index: number) => {
          const interacted = tx.fromAddress?.toLowerCase() === rootId ? tx.toAddress?.toLowerCase() : tx.fromAddress?.toLowerCase();
          if (interacted && interacted !== rootId) {
            
            // NEW: Column and Row math for the Grid Layout
            const col = Math.floor(index / 4);
            const row = index % 4;
            const posX = 450 + (col * 350);
            const posY = 100 + (row * 150);

            nodes.push({
              id: interacted, type: 'cyber', position: { x: posX, y: posY },
              data: { role: 'KDA Interaction', address: interacted, risk: 'warning', volume: `${tx.amount}`, firstSeen: 'Recent', txCount: 1 }
            });
            edges.push({ id: `e-k-${index}`, source: rootId, target: interacted, animated: true, style: { stroke: '#ef4444' } });
          }
        });
      }

    } else {
      // --- REAL ETHEREUM TRACE ---
      const ETHERSCAN_API_KEY = "ZHS5IHVF2PG67MFMZ238KAF6GYXFM5IEX7";
      const url = `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address=${wallet}&startblock=0&endblock=99999999&page=1&offset=12&sort=desc&apikey=${ETHERSCAN_API_KEY}`;
      
      // Added User-Agent to bypass Cloudflare/Etherscan server blocks
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      
      if (!response.ok) throw new Error(`Etherscan blocked request: ${response.status}`);
      const data = await response.json();

      if (data.status === "0") {
        console.error("Etherscan rejected the API key or request:", data.result);
        throw new Error(data.result);
      }

      nodes.push({
        id: rootId, type: 'cyber', position: { x: 50, y: 250 },
        data: { role: 'Ethereum Target', address: wallet, risk: 'critical', volume: '0', firstSeen: 'Mainnet', txCount: data.result?.length || 0 }
      });

      if (data.status === "1" && Array.isArray(data.result)) {
        data.result.forEach((tx: any, index: number) => {
          const interacted = tx.to?.toLowerCase() === rootId ? tx.from?.toLowerCase() : tx.to?.toLowerCase();
          if (interacted) {
            
            // NEW: Column and Row math for the Grid Layout
            const col = Math.floor(index / 4);
            const row = index % 4;
            const posX = 450 + (col * 350);
            const posY = 100 + (row * 150);

            nodes.push({
              id: interacted, type: 'cyber', position: { x: posX, y: posY },
              data: { role: 'Interacted Wallet', address: interacted, risk: 'warning', volume: `${(Number(tx.value) / 1e18).toFixed(4)}`, firstSeen: 'Recent', txCount: 1 }
            });
            edges.push({ id: `e-eth-${tx.hash}`, source: rootId, target: interacted, animated: true, style: { stroke: '#f59e0b' } });
          }
        });
      }
    }

    return NextResponse.json({ nodes, edges });

  } catch (error) {
    // If it fails, log it to the VS Code terminal so we can see it!
    console.error("🚨 TRACE API FAILED:", error);
    
    // Return a safe fallback node so the UI doesn't crash
    return NextResponse.json({ 
      nodes: [{ id: rootId, type: 'cyber', position: { x: 50, y: 250 }, data: { role: 'Secured Node', address: wallet, risk: 'safe', volume: '0', firstSeen: 'Unknown', txCount: '?' } }], 
      edges: [] 
    });
  }
}