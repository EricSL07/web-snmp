#!/usr/bin/env python3
import sys, time, math

# Base OID for our simulated temp subtree
BASE = "1.3.6.1.4.1.8072.9999.1"
TEMP_OID = BASE + ".1"

def now_temp():
    # Simulate a temperature in Celsius between 34 and 46 varying over time
    t = time.time()
    return 40.0 + 6.0 * math.sin(t / 60.0)

def write(line: str):
    sys.stdout.write(line + "\n")
    sys.stdout.flush()

def main():
    while True:
        line = sys.stdin.readline()
        if not line:
            break
        line = line.strip()
        if line == "PING":
            write("PONG")
        elif line.startswith("getnext"):
            # Only one OID in our subtree, return it if base or less
            parts = line.split()
            oid = parts[1] if len(parts) > 1 else ""
            if oid < TEMP_OID:
                val = now_temp()
                write(f"{TEMP_OID}")
                write("gauge")
                write(f"{val:.2f}")
            else:
                write("NONE")
        elif line.startswith("get"):
            parts = line.split()
            oid = parts[1] if len(parts) > 1 else ""
            if oid == TEMP_OID:
                val = now_temp()
                write("VALUE")
                write("gauge")
                write(f"{val:.2f}")
            else:
                write("NONE")
        else:
            # Unknown command
            write("NONE")

if __name__ == "__main__":
    main()
