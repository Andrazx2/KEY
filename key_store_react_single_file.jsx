import React, { useEffect, useState } from "react";

// KeyStore - Single-file React component (updated)
// TailwindCSS required in the host project (e.g., create-react-app + Tailwind)
// Fitur baru: metode pembayaran dan reveal key *hanya* setelah pembayaran sukses.
// NOTE (penting): Ini masih demo-frontend. Integrasikan backend untuk pembayaran nyata (Stripe / Midtrans)
// dan endpoint yang memverifikasi pembayaran sebelum mengeluarkan kunci.

export default function KeyStoreApp() {
  const [products, setProducts] = useState([
    { id: "prod_basic", name: "Basic Key", price: 5.99, description: "Lisensi Basic - 1 bulan" },
    { id: "prod_pro", name: "Pro Key", price: 14.99, description: "Lisensi Pro - 1 tahun" },
    { id: "prod_lifetime", name: "Lifetime Key", price: 49.99, description: "Lisensi Seumur Hidup" }
  ]);

  // Simulated key inventory (frontend only)
  const [keyInventory, setKeyInventory] = useState({
    prod_basic: ["BASIC-XXXX-0001", "BASIC-XXXX-0002", "BASIC-XXXX-0003"],
    prod_pro: ["PRO-XXXX-1001", "PRO-XXXX-1002"],
    prod_lifetime: ["LIFE-XXXX-9001"]
  });

  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem("keystore_cart")) || []; } catch { return []; }
  });

  useEffect(() => { localStorage.setItem("keystore_cart", JSON.stringify(cart)); }, [cart]);

  const addToCart = (productId) => {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    setCart((c) => {
      const found = c.find((it) => it.id === productId);
      if (found) return c.map((it) => (it.id === productId ? { ...it, qty: Math.min(it.qty + 1, 10) } : it));
      return [...c, { id: productId, name: p.name, price: p.price, qty: 1 }];
    });
  };

  const changeQty = (id, qty) => {
    if (qty <= 0) setCart((c) => c.filter((it) => it.id !== id));
    else setCart((c) => c.map((it) => (it.id === id ? { ...it, qty } : it)));
  };

  const removeFromCart = (id) => setCart((c) => c.filter((it) => it.id !== id));

  const subtotal = cart.reduce((s, it) => s + it.price * it.qty, 0);

  // Payment modal state
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("stripe");
  const [isPaying, setIsPaying] = useState(false);
  const [orderResult, setOrderResult] = useState(null); // will hold assigned keys after payment

  // Mock checkout flow now opens payment modal. Actual payment must be handled on backend!
  const handleStartCheckout = () => {
    if (cart.length === 0) return alert("Keranjang masih kosong");
    setShowPayment(true);
  };

  // Simulate server-side checkout + payment verification.
  // In production: call your backend to create a payment session, redirect / open checkout UI (Stripe Elements, Midtrans Snap),
  // and after webhook or server-side verification call your /api/complete-order to claim keys and return them to user.
  const handlePayNow = async () => {
    setIsPaying(true);

    try {
      // ===== DEMO SIMULATION =====
      // We'll wait 1s and then *simulate* a successful payment.
      // Replace this block with a real payment flow:
      // - For Stripe: POST /api/create-payment-intent {cart} -> get client_secret -> confirmCardPayment -> on success POST /api/complete-order
      // - For Midtrans (Indonesia): create transaction on server, use Snap token on client, then verify on server via callback/webhook.
      await new Promise((r) => setTimeout(r, 1000));

      // After payment success, request assigned keys from "server".
      // In demo: we assign keys directly from frontend inventory, but in production
      // you MUST request them from a secure backend AFTER verifying payment.

      const assigned = {};
      const invCopy = { ...keyInventory };

      for (const item of cart) {
        assigned[item.id] = [];
        for (let i = 0; i < item.qty; i++) {
          const list = invCopy[item.id] || [];
          if (list.length === 0) {
            alert(`Stok kunci untuk ${item.name} habis. Batalkan checkout atau hub admin.`);
            setIsPaying(false);
            return;
          }
          assigned[item.id].push(list.shift());
        }
      }

      // Commit inventory change (demo)
      setKeyInventory(invCopy);

      // Clear cart
      setCart([]);

      // Flatten assigned keys for display
      const assignedFlat = Object.entries(assigned)
        .flatMap(([pid, keys]) => keys.map((k) => ({ pid, key: k, productName: products.find(p => p.id === pid)?.name || pid })))

      // Save result to state so we can render 'Your Keys' only after payment
      setOrderResult({
        method: paymentMethod,
        date: new Date().toISOString(),
        items: assignedFlat
      });

      // Close payment modal but keep result open
      setShowPayment(false);

      // In production: store the order and send the keys to user's email as well
    } catch (err) {
      console.error(err);
      alert("Pembayaran gagal — silakan coba lagi.");
    } finally {
      setIsPaying(false);
    }
  };

  // Simple admin modal to add keys (for demo only)
  const [showAdmin, setShowAdmin] = useState(false);
  const [newKeyProduct, setNewKeyProduct] = useState("prod_basic");
  const [newKeyValue, setNewKeyValue] = useState("");
  const addKeyToInventory = () => {
    if (!newKeyValue) return;
    setKeyInventory((prev) => ({ ...prev, [newKeyProduct]: [...(prev[newKeyProduct] || []), newKeyValue] }));
    setNewKeyValue("");
    alert("Kunci berhasil ditambahkan ke inventory (demo)");
  };

  // Helper to render "Your Keys" modal after successful payment
  const [showKeysModal, setShowKeysModal] = useState(false);
  useEffect(() => { if (orderResult) setShowKeysModal(true); }, [orderResult]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">KeyStore - Beli Key Lisensi</h1>
          <div className="flex items-center gap-3">
            <button className="px-3 py-1 rounded bg-indigo-600 text-white hover:opacity-90" onClick={() => setShowAdmin((s) => !s)}>Admin</button>
            <div className="p-2 bg-white rounded shadow">Cart: {cart.reduce((s, it) => s + it.qty, 0)}</div>
          </div>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <section className="md:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {products.map((p) => (
                <div key={p.id} className="bg-white rounded shadow p-4">
                  <h2 className="font-semibold text-lg">{p.name}</h2>
                  <p className="text-sm text-gray-600">{p.description}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-xl font-bold">${p.price.toFixed(2)}</div>
                    <div className="flex items-center gap-2">
                      <button className="px-3 py-1 rounded border" onClick={() => addToCart(p.id)}>Tambah ke Keranjang</button>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-500">Stok demo: { (keyInventory[p.id] || []).length } kunci</div>
                </div>
              ))}
            </div>
          </section>

          <aside className="bg-white rounded shadow p-4">
            <h3 className="font-semibold">Ringkasan Keranjang</h3>
            <div className="mt-3 space-y-3">
              {cart.length === 0 && <div className="text-sm text-gray-500">Keranjang kosong</div>}
              {cart.map((it) => (
                <div key={it.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{it.name}</div>
                    <div className="text-sm text-gray-500">${it.price.toFixed(2)} x {it.qty}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <input type="number" min={1} max={10} value={it.qty} onChange={(e) => changeQty(it.id, Number(e.target.value))} className="w-20 rounded border p-1" />
                      <button className="text-sm text-red-600" onClick={() => removeFromCart(it.id)}>Hapus</button>
                    </div>
                  </div>
                  <div className="font-semibold">${(it.price * it.qty).toFixed(2)}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 border-t pt-3">
              <div className="flex justify-between items-center">
                <div className="text-gray-600">Subtotal</div>
                <div className="font-bold">${subtotal.toFixed(2)}</div>
              </div>
              <button className="mt-3 w-full py-2 rounded bg-green-600 text-white" onClick={handleStartCheckout}>Lanjut ke Pembayaran</button>
            </div>

            <div className="mt-4 text-xs text-gray-500">Catatan: ini adalah demo frontend. Integrasikan backend untuk pembayaran dan penyimpanan kunci.</div>
          </aside>
        </main>

        {/* Payment Modal */}
        {showPayment && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded p-6 w-full max-w-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold">Pembayaran</h4>
                <button onClick={() => setShowPayment(false)} className="text-gray-600">Tutup</button>
              </div>

              <div className="space-y-3">
                <div className="text-sm">Pilih metode pembayaran:</div>
                <div className="flex flex-col gap-2">
                  <label className="inline-flex items-center gap-2"><input type="radio" name="pm" checked={paymentMethod === 'stripe'} onChange={() => setPaymentMethod('stripe')} /> Kartu (Stripe)</label>
                  <label className="inline-flex items-center gap-2"><input type="radio" name="pm" checked={paymentMethod === 'midtrans'} onChange={() => setPaymentMethod('midtrans')} /> Midtrans (Snap)</label>
                  <label className="inline-flex items-center gap-2"><input type="radio" name="pm" checked={paymentMethod === 'manual'} onChange={() => setPaymentMethod('manual')} /> Manual transfer / E-wallet (konfirmasi manual)</label>
                </div>

                <div className="pt-2 text-xs text-gray-600">Total: <span className="font-semibold">${subtotal.toFixed(2)}</span></div>

                <div className="flex gap-2 mt-4">
                  <button disabled={isPaying} onClick={handlePayNow} className="px-4 py-2 rounded bg-blue-600 text-white">Bayar sekarang</button>
                  <button disabled={isPaying} onClick={() => setShowPayment(false)} className="px-4 py-2 rounded border">Batal</button>
                </div>

                <div className="text-xs text-gray-500 pt-2">
                  Catatan integrasi (singkat):
                  <ul className="list-disc ml-5">
                    <li>Stripe: backend buat PaymentIntent lalu pakai Stripe.js di client. Setelah konfirmasi, server harus memanggil endpoint mark-order-paid sebelum mengeluarkan kunci.</li>
                    <li>Midtrans Snap: backend buat transaction token, client panggil Snap popup; verifikasi di server via webhook/callback sebelum release key.</li>
                    <li>Manual: user transfer lalu upload bukti; admin verifikasi, baru kunci dikirim.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Admin modal */}
        {showAdmin && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
            <div className="bg-white rounded p-6 w-full max-w-md shadow">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold">Admin Panel (Demo)</h4>
                <button onClick={() => setShowAdmin(false)} className="text-gray-600">Tutup</button>
              </div>

              <div className="space-y-3">
                <label className="block text-sm">Tambah kunci ke product</label>
                <select value={newKeyProduct} onChange={(e) => setNewKeyProduct(e.target.value)} className="w-full p-2 border rounded">
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input value={newKeyValue} onChange={(e) => setNewKeyValue(e.target.value)} placeholder="Format: XXXX-YYYY-ZZZZ" className="w-full p-2 border rounded" />
                <div className="flex gap-2">
                  <button onClick={addKeyToInventory} className="px-3 py-1 rounded bg-indigo-600 text-white">Tambah</button>
                  <button onClick={() => { setNewKeyValue(""); }} className="px-3 py-1 rounded border">Reset</button>
                </div>

                <div className="pt-3 border-t">
                  <div className="text-sm font-medium">Inventory Saat Ini (preview)</div>
                  <div className="text-xs text-gray-600 mt-2 max-h-36 overflow-auto">
                    {Object.entries(keyInventory).map(([pid, keys]) => (
                      <div key={pid} className="mb-2">
                        <div className="font-semibold">{products.find(p=>p.id===pid)?.name || pid} ({keys.length})</div>
                        <div className="text-xs">{keys.join(", ")}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Your Keys Modal - muncul *hanya* setelah orderResult (pembayaran sukses) */}
        {showKeysModal && orderResult && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded p-6 w-full max-w-xl shadow">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold">Your Keys</h4>
                <button onClick={() => { setShowKeysModal(false); setOrderResult(null); }} className="text-gray-600">Tutup</button>
              </div>

              <div className="text-sm text-gray-600 mb-3">Metode pembayaran: <span className="font-medium">{orderResult.method}</span></div>
              <div className="space-y-2 max-h-72 overflow-auto">
                {orderResult.items.map((it, idx) => (
                  <div key={idx} className="p-3 border rounded flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{it.productName}</div>
                      <div className="text-xs text-gray-600">Diberikan: {new Date(orderResult.date).toLocaleString()}</div>
                    </div>
                    <div className="font-mono">{it.key}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 text-xs text-gray-500">Simpan kunci ini dengan aman. Di produksi, kirim juga ke email user dan simpan record order di server.</div>
            </div>
          </div>
        )}

        <footer className="mt-8 text-sm text-gray-500">Made with ♥ — KeyStore Demo. Integrasikan Stripe / Midtrans / PayPal untuk pembayaran nyata dan verifikasi server-side sebelum release kunci.</footer>
      </div>
    </div>
  );
}

/*
README - tambahan (cara integrasi pembayaran & reveal key)

1) Flow yang aman dan direkomendasikan:
   a. Client (browser) kirim request ke backend: POST /api/create-order dengan cart dan user details.
   b. Backend membuat order (status: pending), menghitung total, dan membuat pembayaran (Stripe PaymentIntent / Midtrans transaction), lalu mengembalikan token atau client_secret ke client.
   c. Client menyelesaikan flow pembayaran (Stripe.js / Midtrans Snap). Setelah pembayaran selesai di client, backend harus menerima webhook dari provider pembayaran atau client harus memanggil endpoint verify.
   d. Setelah backend memverifikasi pembayaran (webhook / server-side check), backend akan: mark order as paid, mengambil kunci dari database secara atomic (mark as sold), menyimpan record transaksi, dan mengirim email kepada user berisi kunci.
   e. Backend mengembalikan response aman ke client (contoh: /api/order/12345/keys) yang hanya bisa diambil oleh pemilik order.

2) Endpoint contoh yang perlu dibuat di server (pseudo):
   - POST /api/create-order { cart, user } -> returns { orderId, paymentSession }
   - POST /api/confirm-payment { orderId, paymentData } (optional, depends on provider)
   - Webhook /api/webhook/payment -> backend verify -> allocate keys -> send email
   - GET /api/order/:id/keys (auth required) -> returns assigned keys

3) Atomic key allocation:
   - Gunakan transaksi DB (FOR UPDATE / row lock) saat mengambil kunci supaya tidak ada race condition (dua order ambil kunci yang sama).

4) Keamanan:
   - Jangan simpan kunci mentah di frontend.
   - Validasi semua request di server.
   - Amankan admin panel dengan autentikasi + role check.
*/
