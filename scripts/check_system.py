import ctypes
import os
import sys

def get_system_ram():
    class MEMORYSTATUSEX(ctypes.Structure):
        _fields_ = [
            ("dwLength", ctypes.c_ulong),
            ("dwMemoryLoad", ctypes.c_ulong),
            ("ullTotalPhys", ctypes.c_ulonglong),
            ("ullAvailPhys", ctypes.c_ulonglong),
            ("ullTotalPageFile", ctypes.c_ulonglong),
            ("ullAvailPageFile", ctypes.c_ulonglong),
            ("ullTotalVirtual", ctypes.c_ulonglong),
            ("ullAvailVirtual", ctypes.c_ulonglong),
            ("sullAvailExtendedVirtual", ctypes.c_ulonglong),
        ]

    stat = MEMORYSTATUSEX()
    stat.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
    ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(stat))
    return {
        "total_gb": round(stat.ullTotalPhys / (1024**3), 2),
        "available_gb": round(stat.ullAvailPhys / (1024**3), 2),
        "used_gb": round((stat.ullTotalPhys - stat.ullAvailPhys) / (1024**3), 2),
        "memory_load_pct": stat.dwMemoryLoad
    }

if __name__ == "__main__":
    ram = get_system_ram()
    print(f"Total RAM: {ram['total_gb']} GB")
    print(f"Used RAM: {ram['used_gb']} GB")
    print(f"Available RAM: {ram['available_gb']} GB")
    print(f"Memory Load: {ram['memory_load_pct']}%")
    print(f"Logical CPUs: {os.cpu_count()}")
