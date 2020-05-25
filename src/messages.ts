export interface Message {
    userid: string;
    type: "discover" | "sync" | "followup" | "delay_req" | "delay_reply";
}

export interface DiscoverMessage extends Message {
    type: "discover",
}

export interface SyncMessage extends Message {
    type: "sync"
}

export interface FollowUpMessage extends Message {
    type: "followup",
    master_sync_time: number
}

export interface RequestDelayMessage extends Message {
    type: "delay_req"
}

export interface ReplyDelayMessage extends Message {
    type: "delay_reply",
    req_time: number
}