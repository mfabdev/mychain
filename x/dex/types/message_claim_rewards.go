package types

func NewMsgClaimRewards(user string) *MsgClaimRewards {
	return &MsgClaimRewards{
		User: user,
	}
}
