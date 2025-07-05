/* eslint-disable */
import { Coin } from "../../../cosmos/base/v1beta1/coin";
import Long from "long";
import _m0 from "protobufjs/minimal";

export const protobufPackage = "mychain.dex.v1";

/** MsgCreateOrder defines a message to create a new order */
export interface MsgCreateOrder {
  maker: string;
  pairId: Long;
  price?: Coin;
  amount?: Coin;
  isBuy: boolean;
}

/** MsgCreateOrderResponse defines the response for creating an order */
export interface MsgCreateOrderResponse {
  orderId: Long;
}

/** MsgCancelOrder defines a message to cancel an existing order */
export interface MsgCancelOrder {
  maker: string;
  orderId: Long;
}

/** MsgCancelOrderResponse defines the response for canceling an order */
export interface MsgCancelOrderResponse {}

/** MsgClaimRewards defines a message to claim accumulated rewards */
export interface MsgClaimRewards {
  user: string;
  amount: string;
}

/** MsgClaimRewardsResponse defines the response for claiming rewards */
export interface MsgClaimRewardsResponse {
  claimedAmount: string;
}

/** MsgClaimOrderRewards defines a message to claim rewards from specific orders */
export interface MsgClaimOrderRewards {
  user: string;
  orderIds: Long[];
}

/** MsgClaimOrderRewardsResponse defines the response for claiming order rewards */
export interface MsgClaimOrderRewardsResponse {
  totalClaimed: string;
}

function createBaseMsgCreateOrder(): MsgCreateOrder {
  return {
    maker: "",
    pairId: Long.UZERO,
    price: undefined,
    amount: undefined,
    isBuy: false,
  };
}

export const MsgCreateOrder = {
  encode(message: MsgCreateOrder, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.maker !== "") {
      writer.uint32(10).string(message.maker);
    }
    if (!message.pairId.isZero()) {
      writer.uint32(16).uint64(message.pairId);
    }
    if (message.price !== undefined) {
      Coin.encode(message.price, writer.uint32(26).fork()).ldelim();
    }
    if (message.amount !== undefined) {
      Coin.encode(message.amount, writer.uint32(34).fork()).ldelim();
    }
    if (message.isBuy === true) {
      writer.uint32(40).bool(message.isBuy);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MsgCreateOrder {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgCreateOrder();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.maker = reader.string();
          break;
        case 2:
          message.pairId = reader.uint64() as Long;
          break;
        case 3:
          message.price = Coin.decode(reader, reader.uint32());
          break;
        case 4:
          message.amount = Coin.decode(reader, reader.uint32());
          break;
        case 5:
          message.isBuy = reader.bool();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): MsgCreateOrder {
    return {
      maker: isSet(object.maker) ? String(object.maker) : "",
      pairId: isSet(object.pairId) ? Long.fromValue(object.pairId) : Long.UZERO,
      price: isSet(object.price) ? Coin.fromJSON(object.price) : undefined,
      amount: isSet(object.amount) ? Coin.fromJSON(object.amount) : undefined,
      isBuy: isSet(object.isBuy) ? Boolean(object.isBuy) : false,
    };
  },

  toJSON(message: MsgCreateOrder): unknown {
    const obj: any = {};
    message.maker !== undefined && (obj.maker = message.maker);
    message.pairId !== undefined && (obj.pairId = (message.pairId || Long.UZERO).toString());
    message.price !== undefined && (obj.price = message.price ? Coin.toJSON(message.price) : undefined);
    message.amount !== undefined && (obj.amount = message.amount ? Coin.toJSON(message.amount) : undefined);
    message.isBuy !== undefined && (obj.isBuy = message.isBuy);
    return obj;
  },

  fromPartial(object: DeepPartial<MsgCreateOrder>): MsgCreateOrder {
    const message = createBaseMsgCreateOrder();
    message.maker = object.maker ?? "";
    message.pairId = object.pairId !== undefined && object.pairId !== null ? Long.fromValue(object.pairId) : Long.UZERO;
    message.price = object.price !== undefined && object.price !== null ? Coin.fromPartial(object.price) : undefined;
    message.amount = object.amount !== undefined && object.amount !== null ? Coin.fromPartial(object.amount) : undefined;
    message.isBuy = object.isBuy ?? false;
    return message;
  },
};

function createBaseMsgCancelOrder(): MsgCancelOrder {
  return {
    maker: "",
    orderId: Long.UZERO,
  };
}

export const MsgCancelOrder = {
  encode(message: MsgCancelOrder, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.maker !== "") {
      writer.uint32(10).string(message.maker);
    }
    if (!message.orderId.isZero()) {
      writer.uint32(16).uint64(message.orderId);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MsgCancelOrder {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgCancelOrder();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.maker = reader.string();
          break;
        case 2:
          message.orderId = reader.uint64() as Long;
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },

  fromJSON(object: any): MsgCancelOrder {
    return {
      maker: isSet(object.maker) ? String(object.maker) : "",
      orderId: isSet(object.orderId) ? Long.fromValue(object.orderId) : Long.UZERO,
    };
  },

  toJSON(message: MsgCancelOrder): unknown {
    const obj: any = {};
    message.maker !== undefined && (obj.maker = message.maker);
    message.orderId !== undefined && (obj.orderId = (message.orderId || Long.UZERO).toString());
    return obj;
  },

  fromPartial(object: DeepPartial<MsgCancelOrder>): MsgCancelOrder {
    const message = createBaseMsgCancelOrder();
    message.maker = object.maker ?? "";
    message.orderId = object.orderId !== undefined && object.orderId !== null ? Long.fromValue(object.orderId) : Long.UZERO;
    return message;
  },
};

export const MsgCreateOrderProtoType = {
  typeUrl: "/mychain.dex.v1.MsgCreateOrder",
  encode: MsgCreateOrder.encode,
  decode: MsgCreateOrder.decode,
  fromJSON: MsgCreateOrder.fromJSON,
  toJSON: MsgCreateOrder.toJSON,
  fromPartial: MsgCreateOrder.fromPartial,
};

export const MsgCancelOrderProtoType = {
  typeUrl: "/mychain.dex.v1.MsgCancelOrder",
  encode: MsgCancelOrder.encode,
  decode: MsgCancelOrder.decode,
  fromJSON: MsgCancelOrder.fromJSON,
  toJSON: MsgCancelOrder.toJSON,
  fromPartial: MsgCancelOrder.fromPartial,
};

type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;

type DeepPartial<T> = T extends Builtin
  ? T
  : T extends Long
  ? string | number | Long
  : T extends Array<infer U>
  ? Array<DeepPartial<U>>
  : T extends ReadonlyArray<infer U>
  ? ReadonlyArray<DeepPartial<U>>
  : T extends {}
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>;

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}