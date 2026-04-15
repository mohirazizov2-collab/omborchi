import React, { useState } from "react";

const warehouses = [
  { id: 1, name: "Ombor 1" },
  { id: 2, name: "Ombor 2" },
  { id: 3, name: "Ombor 3" }
];

const initialProducts = [
  { id: 1, name: "iPhone 13", category: "Telefonlar", price: 1000, stock: { 1: 10, 2: 5, 3: 8 } },
  { id: 2, name: "AirPods", category: "Quloqliklar", price: 200, stock: { 1: 15, 2: 7, 3: 10 } },
  { id: 3, name: "iPad", category: "Planshetlar", price: 800, stock: { 1: 5, 2: 3, 3: 6 } },
  { id: 4, name: "Zaryadnik", category: "Aksessuarlar", price: 50, stock: { 1: 20, 2: 10, 3: 12 } }
];

export default function POS() {
  const [warehouse, setWarehouse] = useState(1);
  const [products, setProducts] = useState(initialProducts);
  const [cart, setCart] = useState([]);
  const [category, setCategory] = useState("All");
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState("sum");
  const [paymentType, setPaymentType] = useState("naqd");
  const [cash, setCash] = useState(0);
  const [showCheck, setShowCheck] = useState(false);

  const getStock = (p) => p.stock[warehouse];

  const addToCart = (product) => {
    if (getStock(product) <= 0) return;

    setProducts(products.map(p =>
      p.id === product.id
        ? { ...p, stock: { ...p.stock, [warehouse]: p.stock[warehouse] - 1 } }
        : p
    ));

    const exist = cart.find(c => c.id === product.id);
    if (exist) {
      setCart(cart.map(c => c.id === product.id ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  };

  const updateQty = (id, delta) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const qty = item.qty + delta;
        if (qty <= 0) return null;
        return { ...item, qty };
      }
      return item;
    }).filter(Boolean));
  };

  const clearCart = () => setCart([]);

  const filtered = category === "All" ? products : products.filter(p => p.category === category);

  let total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const discountValue = discountType === "%" ? (total * discount) / 100 : discount;
  const finalTotal = Math.max(total - discountValue, 0);
  const change = cash - finalTotal;

  return (
    <div className="p-4 grid grid-cols-2 gap-4">

      <div>
        <h2 className="font-bold">Sklad</h2>
        <select onChange={(e)=>setWarehouse(Number(e.target.value))} className="border p-2">
          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>

        <h2 className="mt-4 font-bold">Kategoriya</h2>
        <select onChange={(e)=>setCategory(e.target.value)} className="border p-2">
          <option value="All">Hammasi</option>
          <option>Telefonlar</option>
          <option>Quloqliklar</option>
          <option>Planshetlar</option>
          <option>Aksessuarlar</option>
        </select>

        <div className="grid grid-cols-2 gap-2 mt-4">
          {filtered.map(p => (
            <div key={p.id} onClick={()=>addToCart(p)} className="border p-2 cursor-pointer">
              <p>{p.name}</p>
              <p>{p.price}</p>
              <p>Qoldiq: {getStock(p)}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-bold">Savat</h2>
        {cart.map(item => (
          <div key={item.id} className="flex justify-between">
            <span>{item.name}</span>
            <div>
              <button onClick={()=>updateQty(item.id,-1)}>-</button>
              <span>{item.qty}</span>
              <button onClick={()=>updateQty(item.id,1)}>+</button>
            </div>
            <span>{item.price * item.qty}</span>
          </div>
        ))}

        <button onClick={clearCart} className="bg-red-500 text-white p-1 mt-2">Tozalash</button>

        <div className="mt-2">
          <input type="number" placeholder="Chegirma" onChange={e=>setDiscount(Number(e.target.value))} />
          <select onChange={e=>setDiscountType(e.target.value)}>
            <option value="sum">So'm</option>
            <option value="%">%</option>
          </select>
        </div>

        <div className="mt-2">
          <select onChange={e=>setPaymentType(e.target.value)}>
            <option value="naqd">Naqd</option>
            <option value="karta">Karta</option>
            <option value="aralash">Aralash</option>
          </select>
        </div>

        {paymentType !== "karta" && (
          <input type="number" placeholder="Naqd pul" onChange={e=>setCash(Number(e.target.value))} />
        )}

        <div className="mt-2">Jami: {finalTotal}</div>
        {paymentType === "naqd" && <div>Qaytim: {change}</div>}

        <button onClick={()=>setShowCheck(true)} className="bg-green-500 text-white p-2 mt-2">Sotish</button>

        {showCheck && (
          <div className="border p-4 mt-4">
            <h3>Chek</h3>
            {cart.map(i => <div key={i.id}>{i.name} x{i.qty}</div>)}
            <p>Jami: {finalTotal}</p>
            <button onClick={()=>{clearCart(); setShowCheck(false);}}>Yopish</button>
          </div>
        )}
      </div>
    </div>
  );
}
