package types

func NewMsgCancelOrder(maker string, orderId uint64) *MsgCancelOrder {
	return &MsgCancelOrder{
		Maker:   maker,
		OrderId: orderId,
	}
}
