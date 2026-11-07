# DISPOSABLE VIRTUAL ENVIRONMENT MANAGER (DVEM)
## MCA Academic Mini-Project Report
### Specialization: Cloud Computing, Virtualization & Operating Systems

---

## 1. Project Abstract
The **Disposable Virtual Environment Manager (DVEM)** is a web-based virtualization management system developed to provide lightweight, temporary, and isolated Linux runtime environments without imposing the severe storage, memory, and performance overhead of traditional hardware hypervisors. Utilizing the host workstation's existing Docker Desktop Engine (WSL 2 backend with modern Cgroups v2), DVEM enables users to provision on-demand Ubuntu, Python, Node.js, and Alpine environments in under two seconds.

DVEM delivers full terminal access through an in-browser `xterm.js` terminal over WebSockets, enforces hardware CPU quotas and physical RAM memory limits at the kernel level, provides container filesystem management (file creation, upload, and download), supports persistent storage volumes, and automates environment lifecycle garbage collection through a background expiration scheduler.

---

## 2. System Architecture & Virtualization Mechanics

### 2.1 OS-Level Virtualization vs. Hardware Hypervisors
In traditional hypervisor architectures (such as VMware Workstation or VirtualBox), a virtual machine monitor (VMM) virtualizes physical hardware (CPU registers, MMU, NICs, storage controllers), requiring a complete guest operating system kernel to boot inside each VM. This architecture incurs substantial overhead:
- **Memory Overhead:** Each VM consumes a minimum of 2–4 GB for kernel structures and system daemons.
- **Boot Latency:** 30–90 seconds per instance.
- **Disk Footprint:** 10–30 GB per virtual disk image.

DVEM employs **operating system-level virtualization (containerization)**:
- All containers share the underlying host Linux kernel provided by Docker Desktop's WSL 2 VM (`6.18.33.2-microsoft-standard-WSL2`).
- Isolation is achieved through kernel namespaces (`pid`, `net`, `mnt`, `ipc`, `uts`, `user`).
- Each container executes with near-native performance, booting in < 1.5 seconds with an idle memory footprint under 5–25 MB.

### 2.2 Control Groups (Cgroups v2) Enforcement
DVEM enforces strict hardware resource limits directly via Docker Engine's modern Cgroup v2 driver:
- **Physical Memory Boundary:** Configured using `mem_limit` (mapped to `memory.max` in cgroupfs). When container processes exceed this limit, the Linux Out-Of-Memory (OOM) killer selectively terminates rogue child processes without affecting the host or other containers.
- **CPU Quota Enforcement:** Configured via `nano_cpus` (mapped to `cpu.max` in cgroupfs, expressed as `$QUOTA $PERIOD`). For example, an allocation of 0.5 CPU cores restricts the container process group to 50,000 microseconds of CPU time per 100,000-microsecond period.

### 2.3 Union Filesystem & Ephemeral Storage
Containers instantiated in DVEM utilize Docker's `overlayfs` snapshotter:
- The base container image layers remain strictly read-only.
- A thin copy-on-write (CoW) upper layer captures all runtime modifications (file creation, package installation, editing).
- Upon container expiration or deletion, the ephemeral upper layer is instantly discarded, restoring system cleanliness without residual file fragments.

---

## 3. Implementation Modules

### 3.1 Backend Architecture (FastAPI & Docker SDK)
- **Framework:** FastAPI with asynchronous event handling and OpenAPI documentation.
- **Virtualization Interface:** Official Docker Python SDK (`docker.from_env()`) communicating with Docker Desktop over the Windows named pipe `//./pipe/docker_engine`.
- **Database Engine:** SQLite database accessed via SQLAlchemy 2.0 ORM (`data/dvem.db`), tracking environment metadata, expiration timestamps, volume mounts, and audit logs.
- **Reconciliation Engine:** At startup and on query, DVEM queries the Docker daemon to reconcile container runtime state against the database, ensuring true state representation.

### 3.2 Terminal Subsystem (xterm.js & WebSockets)
- Browser-based terminal emulation using `@xterm/xterm` with the `@xterm/addon-fit` auto-resizing addon.
- Bi-directional WebSocket communication bridging keystrokes and ANSI escape codes to Docker's low-level `exec_create` and `exec_start` pseudo-terminal streams.
- Full support for interactive shells, tab completion, command history, vim/nano text editing, and dynamic terminal window resizing (`exec_resize`).

### 3.3 Container Filesystem Manager
- Provides safe, non-destructive file browsing inside containers without mounting host root filesystems.
- Employs Docker's archive streaming APIs (`get_archive` and `put_archive`) to support seamless file downloads and multi-part file uploads.
- Built-in text file creation and directory management inside container paths.

### 3.4 Persistent Volume Subsystem
- Enables users to optionally attach named Docker persistent volumes (e.g. mounted at `/data`).
- Guarantees that code, databases, and project datasets persist even if the ephemeral container is terminated or recreated.

### 3.5 Automated Cleanup & Expiration Engine
- Asynchronous background worker evaluating active environment expiration timestamps every 30 seconds.
- Automatically stops and destroys expired containers while preserving persistent volumes and recording audit history.

---

## 4. Verification & Testing Matrix

The implementation was verified using real integration tests executing against Docker Desktop:

| Test ID | Test Case | Target Component | Verified Behavior | Status |
| :---: | :--- | :--- | :--- | :---: |
| **TC-01** | Docker Engine API Connectivity | Docker Python SDK | Verified ping and version inspection (`Engine 29.7.2, API 1.55`) | **PASSED** |
| **TC-02** | Host Telemetry Sampling | `psutil` / Windows API | Real CPU load, RAM utilization (used/free), and C:/X:/Y: drive capacities | **PASSED** |
| **TC-03** | Real Ubuntu Container Creation | Docker SDK / OverlayFS | Instantiated container `dvem-test-ubuntu` with 512MB RAM and 0.5 CPU limits | **PASSED** |
| **TC-04** | Genuine Linux Command Execution | Docker Exec API | Executed `uname -a`, `cat /etc/os-release`, verified Ubuntu 22.04 LTS output | **PASSED** |
| **TC-05** | In-Container File Operations | POSIX Filesystem | Created directory `/MCA_Project`, created `demo.txt`, read contents back | **PASSED** |
| **TC-06** | Hardware Cgroup Limit Verification | Cgroups v2 Memory Stats | Verified physical memory limit enforced at exactly 536,870,912 bytes (512 MB) | **PASSED** |
| **TC-07** | Persistent Volume Lifecycle | Docker Volumes | Created volume, verified listing in Docker Engine, tested deletion | **PASSED** |
| **TC-08** | Full Container Lifecycle | Container Manager | Tested start, stop, restart, pause, unpause, and safe removal | **PASSED** |
| **TC-09** | Zero-Touch Host Protection | Security Boundary | Verified 3 existing `postgres:16-alpine` containers remained completely untouched | **PASSED** |
| **TC-10** | Frontend Production Build | Vite / TypeScript | Built TypeScript React frontend into minified production assets with zero errors | **PASSED** |

---

## 5. Conclusion & Academic Significance
The Disposable Virtual Environment Manager fulfills all academic criteria for demonstrating modern cloud virtualization, operating system process isolation, resource governance, and container lifecycle automation. By directly integrating with the existing Docker Desktop installation on Windows 11, DVEM bridges theoretical virtualization concepts with a tangible, high-performance developer tool suitable for practical lab applications and viva demonstration.
