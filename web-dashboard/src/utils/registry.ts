import { GeneratedType, Registry } from '@cosmjs/proto-signing';
import { defaultRegistryTypes } from '@cosmjs/stargate';

// Define the custom message types for our blockchain
export interface MsgBuyMaincoin {
  buyer: string;
  paymentAmount: string;
}

export interface MsgSellMaincoin {
  seller: string;
  sellAmount: string;
}

// Create the custom message type definitions
const customTypes: ReadonlyArray<[string, GeneratedType]> = [
  // Note: Since we don't have the generated protobuf types, we'll use a simplified approach
  // In a production app, these would be imported from generated protobuf files
];

// Create a registry with both default and custom types
export function createCustomRegistry(): Registry {
  return new Registry([...defaultRegistryTypes]);
}

// Helper function to create messages in the format expected by CosmJS
export function createBuyMaincoinMsg(buyer: string, paymentAmount: string) {
  return {
    typeUrl: '/mychain.maincoin.v1.MsgBuyMaincoin',
    value: {
      buyer,
      paymentAmount,
    },
  };
}

export function createSellMaincoinMsg(seller: string, sellAmount: string) {
  return {
    typeUrl: '/mychain.maincoin.v1.MsgSellMaincoin',
    value: {
      seller,
      sellAmount,
    },
  };
}