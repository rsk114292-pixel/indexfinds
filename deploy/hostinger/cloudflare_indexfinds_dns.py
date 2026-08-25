#!/usr/bin/env python3
"""Guarded Cloudflare cutover and rollback for indexfinds.com."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen


ZONE_ID = "85df2d59fc519c4c198125e388b75624"
APEX_RECORD_ID = "c0042494a59185f0255f2fe6485d3164"
WWW_RECORD_ID = "8474a3e02f0ac18588a024a87b11e727"
VERCEL_TARGET = "5ffbd43935ec2112.vercel-dns-017.com"
HOSTINGER_IPV4 = "186.240.157.184"
SNAPSHOT_PATH = Path(
    "/root/.indexfinds-migration/records/"
    "vercel-hostinger-production-20260825T120912Z/dns-before-cutover.json"
)


def call(method: str, path: str, payload: dict | None = None) -> dict:
    token = os.environ.get("CLOUDFLARE_API_TOKEN")
    if not token:
        raise SystemExit("CLOUDFLARE_API_TOKEN is required")
    body = json.dumps(payload).encode() if payload is not None else None
    request = Request(
        f"https://api.cloudflare.com/client/v4{path}",
        data=body,
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urlopen(request, timeout=30) as response:
            result = json.load(response)
    except HTTPError as error:
        raise SystemExit(f"Cloudflare API failed with HTTP {error.code}") from error
    if not result.get("success"):
        raise SystemExit("Cloudflare API returned an unsuccessful result")
    return result["result"]


def get_record(record_id: str) -> dict:
    return call("GET", f"/zones/{ZONE_ID}/dns_records/{record_id}")


def put_record(record_id: str, payload: dict) -> dict:
    return call("PUT", f"/zones/{ZONE_ID}/dns_records/{record_id}", payload)


def safe_view(record: dict) -> dict:
    return {
        "id": record["id"],
        "type": record["type"],
        "name": record["name"],
        "content": record["content"],
        "ttl": record["ttl"],
        "proxied": record.get("proxied", False),
    }


def expected_vercel(record: dict, name: str) -> bool:
    return (
        record.get("type") == "CNAME"
        and record.get("name") == name
        and record.get("content") == VERCEL_TARGET
        and record.get("proxied") is False
    )


def vercel_payload(name: str) -> dict:
    return {
        "type": "CNAME",
        "name": name,
        "content": VERCEL_TARGET,
        "ttl": 1,
        "proxied": False,
        "comment": None,
    }


def hostinger_payload(name: str) -> dict:
    return {
        "type": "A",
        "name": name,
        "content": HOSTINGER_IPV4,
        "ttl": 1,
        "proxied": True,
        "comment": "Vercel to Hostinger VPS cutover 2026-08-25",
    }


def plan() -> None:
    records = [get_record(APEX_RECORD_ID), get_record(WWW_RECORD_ID)]
    print(json.dumps([safe_view(record) for record in records], indent=2))


def cutover() -> None:
    if os.environ.get("HOSTINGER_SNAPSHOT_CONFIRMED") != "1":
        raise SystemExit("HOSTINGER_SNAPSHOT_CONFIRMED=1 is required")
    apex = get_record(APEX_RECORD_ID)
    www = get_record(WWW_RECORD_ID)
    if not expected_vercel(apex, "indexfinds.com") or not expected_vercel(
        www, "www.indexfinds.com"
    ):
        raise SystemExit("Current DNS does not match the recorded Vercel rollback state")
    SNAPSHOT_PATH.parent.mkdir(parents=True, exist_ok=True)
    SNAPSHOT_PATH.write_text(
        json.dumps([safe_view(apex), safe_view(www)], indent=2), encoding="utf-8"
    )
    SNAPSHOT_PATH.chmod(0o600)
    put_record(APEX_RECORD_ID, hostinger_payload("indexfinds.com"))
    try:
        put_record(WWW_RECORD_ID, hostinger_payload("www.indexfinds.com"))
    except BaseException:
        put_record(APEX_RECORD_ID, vercel_payload("indexfinds.com"))
        raise
    plan()


def rollback() -> None:
    if os.environ.get("CONFIRM_ROLLBACK") != "1":
        raise SystemExit("CONFIRM_ROLLBACK=1 is required")
    put_record(APEX_RECORD_ID, vercel_payload("indexfinds.com"))
    put_record(WWW_RECORD_ID, vercel_payload("www.indexfinds.com"))
    plan()


if __name__ == "__main__":
    actions = {"plan": plan, "cutover": cutover, "rollback": rollback}
    if len(sys.argv) != 2 or sys.argv[1] not in actions:
        raise SystemExit(f"usage: {sys.argv[0]} plan|cutover|rollback")
    actions[sys.argv[1]]()
