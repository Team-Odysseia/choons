import client from './client'
import type { PartyQueuePolicy, PartyStateResponse } from './types'

export const createParty = (name: string, queuePolicy: PartyQueuePolicy) =>
  client.post<PartyStateResponse>('/parties', { name, queuePolicy }).then((r) => r.data)

export const joinParty = (inviteCode: string) =>
  client.post<PartyStateResponse>('/parties/join', { inviteCode }).then((r) => r.data)

export const getMyParty = () => client.get<PartyStateResponse>('/parties/me').then((r) => r.data)

export const getPartyState = (inviteCode: string) =>
  client.get<PartyStateResponse>(`/parties/${inviteCode}/state`).then((r) => r.data)

export const leaveParty = (inviteCode: string) => client.post(`/parties/${inviteCode}/leave`)

export const endParty = (inviteCode: string) => client.post(`/parties/${inviteCode}/end`)

export const kickPartyMember = (inviteCode: string, userId: string) =>
  client.post<PartyStateResponse>(`/parties/${inviteCode}/members/${userId}/kick`).then((r) => r.data)

export const setPartyMemberDj = (inviteCode: string, userId: string, dj: boolean) =>
  client.post<PartyStateResponse>(`/parties/${inviteCode}/members/${userId}/dj`, { dj }).then((r) => r.data)

export const addPartyQueueTrack = (inviteCode: string, trackId: string) =>
  client.post<PartyStateResponse>(`/parties/${inviteCode}/queue`, { trackId }).then((r) => r.data)

export const addPartyQueueTracks = (inviteCode: string, trackIds: string[]) =>
  client.post<PartyStateResponse>(`/parties/${inviteCode}/queue/batch`, { trackIds }).then((r) => r.data)

export const removePartyQueueTrack = (inviteCode: string, itemId: string) =>
  client.delete<PartyStateResponse>(`/parties/${inviteCode}/queue/${itemId}`).then((r) => r.data)

export const reorderPartyQueue = (inviteCode: string, orderedItemIds: string[]) =>
  client.put<PartyStateResponse>(`/parties/${inviteCode}/queue/reorder`, { orderedItemIds }).then((r) => r.data)

export const partyPlay = (inviteCode: string, trackId: string, positionSec: number) =>
  client
    .post<PartyStateResponse>(`/parties/${inviteCode}/playback/play`, { trackId, positionSec })
    .then((r) => r.data)

export const partyPause = (inviteCode: string, positionSec: number) =>
  client.post<PartyStateResponse>(`/parties/${inviteCode}/playback/pause`, { positionSec }).then((r) => r.data)

export const partySeek = (inviteCode: string, positionSec: number) =>
  client.post<PartyStateResponse>(`/parties/${inviteCode}/playback/seek`, { positionSec }).then((r) => r.data)

export const partyNext = (inviteCode: string) =>
  client.post<PartyStateResponse>(`/parties/${inviteCode}/playback/next`).then((r) => r.data)

export const partyPrev = (inviteCode: string) =>
  client.post<PartyStateResponse>(`/parties/${inviteCode}/playback/prev`).then((r) => r.data)
