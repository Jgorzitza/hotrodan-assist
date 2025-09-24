# Simple rules for when to escalate to GPT-5
ESCALATE_KEYWORDS = {
    # multi-constraint reasoning & edge cases
    "boost", "turbo", "supercharg", "e85", "ethanol", "flex fuel",
    "horsepower", "hp", "duty cycle", "flow rate", "lph", "gph",
    "returnless", "corvette regulator", "rail regulator",
    "dual tank", "selector valve", "tank switch", "balance tube",
    "pressure drop", "delta p", "cavitation", "vapor lock",
    "sizing", "injector", "regulator location",
}
# If query length (chars) exceeds this, likely multi-part synthesis
LEN_THRESHOLD = 180
# If you ever pass a "needs_deep_reasoning" flag from UI, honor it here
