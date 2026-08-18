'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';

const UnifiedCartContext = createContext(null);

const STORAGE_KEY = 'arynox_unified_cart';

function cartReducer(state, action) {
  switch (action.type) {
    case 'LOAD':
      return action.payload;
    case 'ADD_ROOM':
      return { ...state, rooms: [...state.rooms, action.payload] };
    case 'REMOVE_ROOM':
      return { ...state, rooms: state.rooms.filter((r) => r.id !== action.payload) };
    case 'UPDATE_ROOM':
      return { ...state, rooms: state.rooms.map((r) => r.id === action.payload.id ? { ...r, ...action.payload } : r) };
    case 'ADD_FOOD':
      const existingFood = state.food.find((f) => f.id === action.payload.id);
      if (existingFood) {
        return { ...state, food: state.food.map((f) => f.id === action.payload.id ? { ...f, qty: f.qty + action.payload.qty } : f) };
      }
      return { ...state, food: [...state.food, action.payload] };
    case 'REMOVE_FOOD':
      return { ...state, food: state.food.filter((f) => f.id !== action.payload) };
    case 'UPDATE_FOOD':
      return { ...state, food: state.food.map((f) => f.id === action.payload.id ? { ...f, ...action.payload } : f) };
    case 'CLEAR':
      return { rooms: [], food: [], guest: state.guest };
    case 'SET_GUEST':
      return { ...state, guest: action.payload };
    case 'SET_DATES':
      return { ...state, checkIn: action.payload.checkIn, checkOut: action.payload.checkOut, adults: action.payload.adults };
    default:
      return state;
  }
}

const initialState = { rooms: [], food: [], guest: null, checkIn: null, checkOut: null, adults: 2 };

export function UnifiedCartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialState, () => {
    if (typeof window === 'undefined') return initialState;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return { ...initialState, ...JSON.parse(saved) };
    } catch {}
    return initialState;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const addRoom = useCallback((room) => dispatch({ type: 'ADD_ROOM', payload: room }), []);
  const removeRoom = useCallback((id) => dispatch({ type: 'REMOVE_ROOM', payload: id }), []);
  const updateRoom = useCallback((room) => dispatch({ type: 'UPDATE_ROOM', payload: room }), []);
  const addFood = useCallback((item) => dispatch({ type: 'ADD_FOOD', payload: { ...item, qty: item.qty || 1 } }), []);
  const removeFood = useCallback((id) => dispatch({ type: 'REMOVE_FOOD', payload: id }), []);
  const updateFood = useCallback((item) => dispatch({ type: 'UPDATE_FOOD', payload: item }), []);
  const setGuest = useCallback((guest) => dispatch({ type: 'SET_GUEST', payload: guest }), []);
  const setDates = useCallback((dates) => dispatch({ type: 'SET_DATES', payload: dates }), []);
  const clear = useCallback(() => dispatch({ type: 'CLEAR' }), []);

  const roomTotal = state.rooms.reduce((sum, r) => sum + (r.nights || 1) * (r.price || 0), 0);
  const foodTotal = state.food.reduce((sum, f) => sum + (f.price || 0) * (f.qty || 1), 0);
  const total = roomTotal + foodTotal;
  const hasItems = state.rooms.length > 0 || state.food.length > 0;

  return (
    <UnifiedCartContext.Provider value={{
      ...state,
      addRoom, removeRoom, updateRoom,
      addFood, removeFood, updateFood,
      setGuest, setDates, clear,
      roomTotal, foodTotal, total, hasItems,
    }}>
      {children}
    </UnifiedCartContext.Provider>
  );
}

export function useUnifiedCart() {
  const ctx = useContext(UnifiedCartContext);
  if (!ctx) throw new Error('useUnifiedCart must be used within UnifiedCartProvider');
  return ctx;
}