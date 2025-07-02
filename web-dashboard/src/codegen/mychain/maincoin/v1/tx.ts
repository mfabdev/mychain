import { Coin } from "@cosmjs/amino";
import { BinaryWriter } from "cosmjs-types/binary";

export interface MsgBuyMaincoin {
  buyer: string;
  amount: Coin;
}

export interface MsgSellMaincoin {
  seller: string;
  amount: Coin;
}

// Protobuf type implementations using BinaryWriter
export const MsgBuyMaincoinProtoType = {
  encode(message: MsgBuyMaincoin, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    if (message.buyer !== "") {
      writer.uint32(10).string(message.buyer);
    }
    if (message.amount !== undefined) {
      // Encode Coin as a nested message (field 2, wire type 2)
      writer.uint32(18).fork();
      if (message.amount.denom !== "") {
        writer.uint32(10).string(message.amount.denom);
      }
      if (message.amount.amount !== "") {
        writer.uint32(18).string(message.amount.amount);
      }
      writer.ldelim();
    }
    return writer;
  },
  
  decode(input: Uint8Array, length?: number): MsgBuyMaincoin {
    // Basic implementation
    return {
      buyer: "",
      amount: { denom: "", amount: "0" }
    };
  },
  
  fromPartial(object: Partial<MsgBuyMaincoin>): MsgBuyMaincoin {
    return {
      buyer: object.buyer ?? "",
      amount: object.amount ?? { denom: "", amount: "0" }
    };
  }
};

export const MsgSellMaincoinProtoType = {
  encode(message: MsgSellMaincoin, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
    if (message.seller !== "") {
      writer.uint32(10).string(message.seller);
    }
    if (message.amount !== undefined) {
      // Encode Coin as a nested message
      writer.uint32(18).fork();
      if (message.amount.denom !== "") {
        writer.uint32(10).string(message.amount.denom);
      }
      if (message.amount.amount !== "") {
        writer.uint32(18).string(message.amount.amount);
      }
      writer.ldelim();
    }
    return writer;
  },
  
  decode(input: Uint8Array, length?: number): MsgSellMaincoin {
    return {
      seller: "",
      amount: { denom: "", amount: "0" }
    };
  },
  
  fromPartial(object: Partial<MsgSellMaincoin>): MsgSellMaincoin {
    return {
      seller: object.seller ?? "",
      amount: object.amount ?? { denom: "", amount: "0" }
    };
  }
};