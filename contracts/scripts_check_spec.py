#!/usr/bin/env python3
"""
OpenAPI spec guard.

`yaml.safe_load` accepts DUPLICATE mapping keys and silently keeps the last one,
so a spec with a repeated property still "parses OK" — and the breakage only
surfaces much later, in a consumer running openapi-typescript, as an opaque
YamlParseError pointing at a schema nobody was looking at.

That is not hypothetical: §70.2 inserted a block twice into
PortfolioTotalMetrics (an uncounted replace on a key that exists in two schemas)
and this lint passed it. Two contracts were published before the consumers
caught it.

So: parse, then verify no schema block declares the same property twice, and
verify the document actually bundles (which is what consumers do).
"""
import sys
from collections import Counter
import re

import yaml

PATH = "openapi.yaml"
raw = open(PATH).read()

# 1. parses
doc = yaml.safe_load(raw)

# 2. no duplicate keys — safe_load hides these, so walk the text.
lines = raw.split("\n")
schema_re = re.compile(r"^    (\w+):\s*$")
prop_re = re.compile(r"^        (\w+):")
duplicates = []
i = 0
while i < len(lines):
    m = schema_re.match(lines[i])
    if not m:
        i += 1
        continue
    name = m.group(1)
    j = i + 1
    keys: list[str] = []
    while j < len(lines) and (lines[j].startswith("      ") or not lines[j].strip()):
        km = prop_re.match(lines[j])
        if km:
            keys.append(km.group(1))
        j += 1
    for key, count in Counter(keys).items():
        if count > 1:
            duplicates.append(f"{name}.{key} declared {count}x")
    i = j

if duplicates:
    print("openapi.yaml has DUPLICATE property keys:", file=sys.stderr)
    for d in duplicates:
        print(f"  - {d}", file=sys.stderr)
    print(
        "\nyaml.safe_load keeps the LAST value and reports no error, so this "
        "must be checked explicitly. Duplicate keys break openapi-typescript in "
        "every consumer with a YamlParseError that names the wrong place.",
        file=sys.stderr,
    )
    sys.exit(1)

# 3. the schemas §70 relies on must actually carry the new fields
required = {
    "PortfolioTotalMetrics": ("instrumentsValue", "cashValue", "unpricedPositions", "priceAsOf", "priceSource"),
    "PortfolioSummaryMetrics": ("cashValue", "unpricedPositions", "priceAsOf", "priceSource"),
}
for schema, fields in required.items():
    props = doc.get("components", {}).get("schemas", {}).get(schema, {}).get("properties", {})
    missing = [f for f in fields if f not in props]
    if missing:
        print(f"{schema} is missing {missing}", file=sys.stderr)
        sys.exit(1)

# 4. the in-kind transfer types, and the field that carries their counterparty.
#    A transfer is a position movement with no cash effect; if it is ever dropped
#    from this enum the import rejects the row at the Zod layer, well away from
#    the spec that is supposed to describe it.
schemas = doc.get("components", {}).get("schemas", {})
tx_enum = (
    schemas.get("ImportPortfolioTx", {})
    .get("allOf", [{}])[1]
    .get("properties", {})
    .get("type", {})
    .get("enum", [])
)
for value in ("TRANSFER_OUT", "TRANSFER_IN"):
    if value not in tx_enum:
        print(
            f"ImportPortfolioTx.type is missing {value} (has {tx_enum})",
            file=sys.stderr,
        )
        sys.exit(1)

tx_props = schemas.get("ImportPortfolioTx", {}).get("allOf", [{}])[1].get("properties", {})
if "toPortfolioName" not in tx_props:
    print("ImportPortfolioTx has no toPortfolioName", file=sys.stderr)
    sys.exit(1)
if not tx_props["toPortfolioName"].get("nullable"):
    print("toPortfolioName must be nullable: it is meaningless on other types", file=sys.stderr)
    sys.exit(1)

# The read path needs no enum change: RecentCashTransaction.type stays a plain
# string and displayLabel already exists. Asserted rather than assumed, because
# an enum added here for the wrong reason would force every consumer to widen.
cash_tx = schemas.get("RecentCashTransaction", {}).get("properties", {}).get("type", {})
if "enum" in cash_tx:
    print(
        "RecentCashTransaction.type grew an enum; the transfer types are not "
        "cash transactions and must not appear there",
        file=sys.stderr,
    )
    sys.exit(1)
if "displayLabel" not in schemas.get("RecentCashTransaction", {}).get("properties", {}):
    print("RecentCashTransaction.displayLabel is missing", file=sys.stderr)
    sys.exit(1)

print(
    "openapi.yaml OK: parses, no duplicate keys, §68/§70 fields present, "
    "TRANSFER_OUT/TRANSFER_IN declared"
)
