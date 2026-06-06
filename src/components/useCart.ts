'use client';
import { useState, useCallback } from 'react';

export interface CartOption { id: string; name: string; extra_price: number; }
export interface CartItem {
  cartKey:   string;   // menuId + 옵션 조합 고유키
  menuId:    string;
  name:      string;
  unitPrice: number;
  quantity:  number;
  options:   CartOption[];
  itemTotal: number;
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((item: Omit<CartItem, 'cartKey' | 'itemTotal'>) => {
    const optKey  = item.options.map(o => o.id).sort().join(',');
    const cartKey = `${item.menuId}_${optKey}`;
    const optExtra = item.options.reduce((s, o) => s + o.extra_price, 0);
    const itemTotal = (item.unitPrice + optExtra) * item.quantity;

    setItems(prev => {
      const existing = prev.find(i => i.cartKey === cartKey);
      if (existing) {
        return prev.map(i =>
          i.cartKey === cartKey
            ? { ...i, quantity: i.quantity + item.quantity,
                itemTotal: (i.unitPrice + optExtra) * (i.quantity + item.quantity) }
            : i
        );
      }
      return [...prev, { ...item, cartKey, itemTotal }];
    });
  }, []);

  const removeItem = useCallback((cartKey: string) => {
    setItems(prev => prev.filter(i => i.cartKey !== cartKey));
  }, []);

  const updateQty = useCallback((cartKey: string, qty: number) => {
    if (qty <= 0) {
      setItems(prev => prev.filter(i => i.cartKey !== cartKey));
      return;
    }
    setItems(prev => prev.map(i => {
      if (i.cartKey !== cartKey) return i;
      const optExtra = i.options.reduce((s, o) => s + o.extra_price, 0);
      return { ...i, quantity: qty, itemTotal: (i.unitPrice + optExtra) * qty };
    }));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const totalPrice = items.reduce((s, i) => s + i.itemTotal, 0);
  const totalCount = items.reduce((s, i) => s + i.quantity, 0);

  return { items, addItem, removeItem, updateQty, clear, totalPrice, totalCount };
}
