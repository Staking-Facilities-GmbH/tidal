module tidal::tidal;

use std::string::String;
use sui::coin::Coin;
use sui::dynamic_field as df;
use sui::sui::SUI;
use tidal::utils::is_prefix;

// For Move coding conventions, see
// https://docs.sui.io/concepts/sui-move-concepts/conventions
const EInvalidCap: u64 = 0;
const ENoAccess: u64 = 1;
const EDuplicate: u64 = 2;
const EInvalidFee: u64 = 3;
const MARKER: u64 = 4; // What is that?

public struct Allowlist has key {
    id: UID,
    fee: u64,
    owner: address,
    name: String,
    list: vector<address>,
}

public struct Cap has key {
    id: UID,
    allowlist_id: ID,
}

public fun create_allowlist(fee: u64, name: String, ctx: &mut TxContext): Cap {
    let allowlist = Allowlist {
        id: object::new(ctx),
        fee: fee,
        owner: ctx.sender(),
        name: name,
        list: vector::empty(),
    };
    let cap = Cap {
        id: object::new(ctx),
        allowlist_id: object::id(&allowlist),
    };
    transfer::share_object(allowlist);
    cap
}

entry fun create_allowlist_entry(fee: u64, name: String, ctx: &mut TxContext) {
    transfer::transfer(create_allowlist(fee, name, ctx), ctx.sender());
}

public fun add(fee: Coin<SUI>, allowlist: &mut Allowlist, cap: &Cap, account: address) {
    assert!(cap.allowlist_id == object::id(allowlist), EInvalidCap);
    assert!(fee.value() == allowlist.fee, EInvalidFee);
    assert!(!allowlist.list.contains(&account), EDuplicate); // this won't work with Soulbound NFTs

    transfer::public_transfer(fee, allowlist.owner);
    allowlist.list.push_back(account);
}

public fun namespace(allowlist: &Allowlist): vector<u8> {
    allowlist.id.to_bytes()
}

fun approve_internal(caller: address, id: vector<u8>, allowlist: &Allowlist): bool {
    let namespace = namespace(allowlist);
    if (!is_prefix(namespace, id)) {
        return false
    };

    allowlist.list.contains(&caller)
}

entry fun seal_approve(id: vector<u8>, allowlist: &Allowlist, ctx: &TxContext) {
    assert!(approve_internal(ctx.sender(), id, allowlist), ENoAccess);
}

// What is the purpose of publish?
public fun publish(allowlist: &mut Allowlist, cap: &Cap, blob_id: String) {
    assert!(cap.allowlist_id == object::id(allowlist), EInvalidCap);

    df::add(&mut allowlist.id, blob_id, MARKER);
}
