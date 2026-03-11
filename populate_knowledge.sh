#!/usr/bin/env bash
# populate_knowledge.sh - 用 Linux 内核知识填充知识树系统
# 通过 curl 调用后端 API 批量创建数据
#
# 用法: bash populate_knowledge.sh
# 前置: 后端运行在 localhost:8080

set -euo pipefail

API="http://localhost:8080/api/v1"

# 辅助函数：创建实体并提取 ID
create() {
  local url="$1"
  local data="$2"
  local id_path="${3:-.id}"
  local resp
  resp=$(curl -sf -X POST "$url" -H 'Content-Type: application/json' -d "$data")
  echo "$resp" | jq -r "$id_path"
}

# 辅助函数：POST 不需要返回 ID
post() {
  curl -sf -X POST "$1" -H 'Content-Type: application/json' -d "$2" > /dev/null
}

echo "=== Phase 1: 创建 25 个坑 (Pitfalls) ==="

P1=$(create "$API/pitfalls" '{
  "title": "initrd缺少关键内核模块",
  "description": "initramfs/initrd中未包含目标硬件所需的存储控制器驱动（如ahci、nvme），导致无法找到根文件系统。常见于自行编译内核后未正确配置mkinitcpio/dracut模块列表。",
  "severity": "high",
  "tags": ["linux-boot", "initrd", "kernel-module"]
}')
echo "P1=$P1 - initrd缺少关键内核模块"

P2=$(create "$API/pitfalls" '{
  "title": "root=启动参数指定错误",
  "description": "GRUB或内核命令行中root=参数指向了错误的设备（如/dev/sda1 vs UUID不匹配），导致VFS: Cannot open root device。设备名可能因硬件变更或BIOS设置改变而漂移。",
  "severity": "high",
  "tags": ["linux-boot", "grub", "root-device"]
}')
echo "P2=$P2 - root=启动参数指定错误"

P3=$(create "$API/pitfalls" '{
  "title": "GRUB配置文件语法错误",
  "description": "grub.cfg或/etc/default/grub中存在语法错误（如引号不匹配、变量未转义），导致grub-mkconfig失败或GRUB菜单无法加载内核。update-grub不报错但生成的配置无效。",
  "severity": "medium",
  "tags": ["linux-boot", "grub", "config"]
}')
echo "P3=$P3 - GRUB配置文件语法错误"

P4=$(create "$API/pitfalls" '{
  "title": "dracut配置导致initramfs过大或缺模块",
  "description": "dracut.conf配置了hostonly=no导致initramfs包含所有驱动体积过大，或hostonly=yes但omit_dracutmodules排除了必要模块。嵌入式设备上initramfs过大会显著拖慢启动速度。",
  "severity": "medium",
  "tags": ["linux-boot", "dracut", "initramfs"]
}')
echo "P4=$P4 - dracut配置导致initramfs过大或缺模块"

P5=$(create "$API/pitfalls" '{
  "title": "内核模块加载顺序导致设备未就绪",
  "description": "某些驱动依赖其他子系统先初始化（如SCSI层需要先于具体HBA驱动），initrd中模块加载顺序不当导致probe失败。表现为偶发性启动失败，重启后可能正常。",
  "severity": "medium",
  "tags": ["linux-boot", "module-loading", "race-condition"]
}')
echo "P5=$P5 - 内核模块加载顺序导致设备未就绪"

P6=$(create "$API/pitfalls" '{
  "title": "fstab配置错误导致启动挂载失败",
  "description": "/etc/fstab中UUID写错、挂载选项不兼容（如noauto被误删、nofail缺失），导致systemd挂载单元失败。若根分区以外的分区缺少nofail选项，会触发emergency模式。",
  "severity": "high",
  "tags": ["linux-boot", "storage", "fstab", "systemd"]
}')
echo "P6=$P6 - fstab配置错误导致启动挂载失败"

P7=$(create "$API/pitfalls" '{
  "title": "systemd服务循环依赖",
  "description": "自定义systemd unit之间存在循环依赖（A Requires B, B After A），导致启动超时或死锁。journalctl可见ordering cycle警告但系统仍尝试启动，表现为服务启动极慢。",
  "severity": "medium",
  "tags": ["linux-boot", "systemd", "dependency"]
}')
echo "P7=$P7 - systemd服务循环依赖"

P8=$(create "$API/pitfalls" '{
  "title": "启动阶段OOM导致panic",
  "description": "内核启动早期内存不足（嵌入式设备RAM小、或内核参数mem=限制了可用内存），init进程或关键服务被OOM Killer杀死，系统直接panic。需调整内核内存参数或精简initrd。",
  "severity": "high",
  "tags": ["linux-boot", "oom", "embedded"]
}')
echo "P8=$P8 - 启动阶段OOM导致panic"

P9=$(create "$API/pitfalls" '{
  "title": "VFS: Unable to mount root fs panic",
  "description": "内核在switch_root阶段找不到根文件系统，直接kernel panic。根因可能是：initrd缺驱动、root=参数错、文件系统损坏、或块设备未被内核识别。需结合dmesg和initrd内容排查。",
  "severity": "high",
  "tags": ["linux-boot", "vfs", "panic", "rootfs"]
}')
echo "P9=$P9 - VFS: Unable to mount root fs panic"

P10=$(create "$API/pitfalls" '{
  "title": "SATA链路训练超时",
  "description": "AHCI端口在执行OOB(Out of Band)信号和速率协商时超时，表现为ata*: link is slow to respond / SATA link down。常见原因：线缆质量差、信号完整性问题、PHY参数不匹配、或SSD固件兼容性问题。",
  "severity": "high",
  "tags": ["sata", "ahci", "link-training", "phy"]
}')
echo "P10=$P10 - SATA链路训练超时"

P11=$(create "$API/pitfalls" '{
  "title": "AHCI控制器未被内核识别",
  "description": "PCI枚举阶段未匹配到AHCI驱动，可能因为：PCI Vendor/Device ID不在ahci_pci_tbl中、BIOS设置为IDE/RAID模式而非AHCI、或AHCI BAR空间未正确映射。lspci能看到设备但/dev/下无对应节点。",
  "severity": "high",
  "tags": ["sata", "ahci", "pci", "driver"]
}')
echo "P11=$P11 - AHCI控制器未被内核识别"

P12=$(create "$API/pitfalls" '{
  "title": "NCQ命令错误导致性能下降",
  "description": "磁盘报告NCQ(Native Command Queuing)错误后，libata将队列深度降为1并可能禁用NCQ，导致I/O性能急剧下降。dmesg可见ata*: NCQ disabled due to excessive errors。需排查磁盘固件或更换磁盘。",
  "severity": "medium",
  "tags": ["sata", "ncq", "performance", "libata"]
}')
echo "P12=$P12 - NCQ命令错误导致性能下降"

P13=$(create "$API/pitfalls" '{
  "title": "SATA热插拔导致数据丢失",
  "description": "在未正确实现热插拔通知（SNotification）的控制器上执行热插拔，可能导致：正在写入的数据丢失、文件系统元数据不一致、或内核误判端口状态。需确认控制器支持热插拔并正确配置AHCI CAP.SSS位。",
  "severity": "high",
  "tags": ["sata", "hotplug", "data-loss"]
}')
echo "P13=$P13 - SATA热插拔导致数据丢失"

P14=$(create "$API/pitfalls" '{
  "title": "ALPM节能模式导致链路不稳定",
  "description": "启用Aggressive Link Power Management(ALPM)后，SATA链路在Partial/Slumber状态切换时出现链路错误，表现为频繁的COMRESET和设备重新初始化。某些SSD/HDD固件对ALPM支持不完善，需通过/sys/class/scsi_host/*/link_power_management_policy调整。",
  "severity": "medium",
  "tags": ["sata", "alpm", "power-management", "stability"]
}')
echo "P14=$P14 - ALPM节能模式导致链路不稳定"

P15=$(create "$API/pitfalls" '{
  "title": "DevSleep唤醒失败",
  "description": "从DevSleep深度节能状态唤醒时，设备未在规定时间内响应COMWAKE信号，导致端口reset超时。部分SSD的DevSleep实现不符合SATA规范3.2+的时序要求，需在AHCI驱动中禁用DevSleep或增加超时。",
  "severity": "medium",
  "tags": ["sata", "devsleep", "power-management", "wake"]
}')
echo "P15=$P15 - DevSleep唤醒失败"

P16=$(create "$API/pitfalls" '{
  "title": "FIS接收错误（CRC/Disparity）",
  "description": "SATA链路接收到的FIS(Frame Information Structure)校验失败，SError寄存器显示CRC错误或Disparity错误。通常指示物理层问题：线缆、连接器、PCB走线信号完整性。少量错误可由EH恢复，持续错误需更换硬件。",
  "severity": "medium",
  "tags": ["sata", "fis", "crc", "signal-integrity"]
}')
echo "P16=$P16 - FIS接收错误"

P17=$(create "$API/pitfalls" '{
  "title": "SATA命令超时后连续reset无法恢复",
  "description": "命令超时触发EH(Error Handler)后，soft reset → hard reset → port reset均失败，设备最终被标记为offline(disabled)。根因可能是固件挂死、硬件故障、或PHY彻底断开。恢复需重新scan或物理重新插拔。",
  "severity": "high",
  "tags": ["sata", "timeout", "error-handler", "reset"]
}')
echo "P17=$P17 - SATA命令超时后连续reset无法恢复"

P18=$(create "$API/pitfalls" '{
  "title": "掉电导致文件系统损坏",
  "description": "非正常关机（掉电、内核panic）导致ext4/xfs文件系统元数据不一致。ext4日志可恢复大部分情况，但若日志本身损坏则需fsck。btrfs/ZFS的COW机制更抗掉电但需正确配置flush/barrier。",
  "severity": "high",
  "tags": ["storage", "filesystem", "power-loss", "data-integrity"]
}')
echo "P18=$P18 - 掉电导致文件系统损坏"

P19=$(create "$API/pitfalls" '{
  "title": "I/O调度器选择不当影响性能",
  "description": "HDD使用none调度器导致大量随机I/O时性能极差（应用mq-deadline或bfq），SSD使用cfq导致不必要的合并开销。内核5.0+默认使用多队列调度器，但某些发行版可能覆盖默认设置。",
  "severity": "low",
  "tags": ["storage", "io-scheduler", "performance", "tuning"]
}')
echo "P19=$P19 - I/O调度器选择不当影响性能"

P20=$(create "$API/pitfalls" '{
  "title": "持续I/O错误导致文件系统被强制离线",
  "description": "底层块设备持续报告I/O错误（如磁盘坏道、控制器故障），文件系统错误计数达到阈值后被内核标记为只读或卸载。ext4通过errors=remount-ro挂载选项控制此行为，生产环境应配合监控及时发现。",
  "severity": "high",
  "tags": ["storage", "io-error", "filesystem", "reliability"]
}')
echo "P20=$P20 - I/O错误导致文件系统离线"

P21=$(create "$API/pitfalls" '{
  "title": "ext4 journal replay失败",
  "description": "挂载ext4时日志回放失败（journal checksum error / journal has been aborted），文件系统无法挂载。可能因磁盘坏道影响日志区域，或内核版本升级导致日志格式不兼容。需用e2fsck -fy强制修复，可能丢失数据。",
  "severity": "high",
  "tags": ["storage", "ext4", "journal", "recovery"]
}')
echo "P21=$P21 - ext4 journal replay失败"

P22=$(create "$API/pitfalls" '{
  "title": "OOM Killer误杀关键进程",
  "description": "系统内存不足时OOM Killer根据oom_score选择进程kill，但可能误杀数据库或关键服务而非真正的内存泄漏进程。需通过oom_score_adj (-1000)保护关键进程，或配置cgroup内存限制隔离。",
  "severity": "high",
  "tags": ["kernel-recovery", "oom", "process-management"]
}')
echo "P22=$P22 - OOM Killer误杀关键进程"

P23=$(create "$API/pitfalls" '{
  "title": "softlockup误报干扰排查",
  "description": "内核检测到CPU长时间不调度（默认20秒），报告BUG: soft lockup，但实际可能是正常的长时间计算（如大内存页面清零、加密运算）。误报导致运维误判为内核bug。可通过kernel.softlockup_panic=0和调整阈值减少影响。",
  "severity": "low",
  "tags": ["kernel-recovery", "watchdog", "softlockup", "false-positive"]
}')
echo "P23=$P23 - softlockup误报干扰排查"

P24=$(create "$API/pitfalls" '{
  "title": "hardlockup检测在虚拟机中不可用",
  "description": "hardlockup检测依赖NMI(Non-Maskable Interrupt)和PMU(Performance Monitoring Unit)，但在KVM/VMware等虚拟化环境中PMU可能未暴露给Guest，导致hardlockup watchdog初始化失败。需在hypervisor层配置PMU直通。",
  "severity": "low",
  "tags": ["kernel-recovery", "watchdog", "hardlockup", "virtualization"]
}')
echo "P24=$P24 - hardlockup检测在虚拟机中不可用"

P25=$(create "$API/pitfalls" '{
  "title": "kdump采集失败无法分析panic",
  "description": "内核panic时kexec未能成功启动capture kernel，导致vmcore未生成，无法事后分析。常见原因：crashkernel=预留内存不足（建议256M+）、kdump服务未正确配置、或capture kernel本身缺少必要驱动。",
  "severity": "high",
  "tags": ["kernel-recovery", "kdump", "panic", "debug"]
}')
echo "P25=$P25 - kdump采集失败无法分析panic"

echo ""
echo "=== Phase 2: 创建 1 棵统一知识树 ==="

T1=$(create "$API/knowledge-trees" '{
  "name": "Linux系统全栈知识树",
  "description": "从BIOS加电到用户态运行的完整Linux系统知识体系。主干按时序/逻辑顺序串联四大模块：Linux启动流程 → SATA控制器驱动 → 磁盘挂载与文件系统 → 内核自动恢复机制。每个模块包含详细步骤和关联的坑/异常分支。",
  "module": "linux-system"
}')
echo "T1=$T1 - Linux系统全栈知识树"

echo ""
echo "=== Phase 3: 创建树节点 ==="

# =========================================
# 根级主干：4 个模块节点（时序/逻辑顺序）
# =========================================
echo "--- 根级主干节点 ---"

ROOT_BOOT=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"node_type\": \"step\",
  \"title\": \"阶段一：Linux启动流程\",
  \"description\": \"从BIOS/UEFI加电到systemd完成启动的全流程，覆盖GRUB引导、内核解压初始化、initrd/initramfs加载、rootfs切换和用户态初始化。\",
  \"sort_order\": 0
}")
echo "ROOT_BOOT=$ROOT_BOOT - 阶段一：Linux启动流程"

ROOT_SATA=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"node_type\": \"step\",
  \"title\": \"阶段二：SATA控制器驱动\",
  \"description\": \"Linux SATA/AHCI子系统：libata框架初始化、AHCI PCI probe、端口链路建立、设备识别、命令处理，以及Error Handler、热插拔、电源管理等分支。\",
  \"sort_order\": 1
}")
echo "ROOT_SATA=$ROOT_SATA - 阶段二：SATA控制器驱动"

ROOT_STORAGE=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"node_type\": \"step\",
  \"title\": \"阶段三：磁盘挂载与文件系统\",
  \"description\": \"从块设备发现到文件系统挂载的完整流程：块设备扫描、分区表解析、文件系统类型探测、mount/VFS层、I/O读写、卸载同步。\",
  \"sort_order\": 2
}")
echo "ROOT_STORAGE=$ROOT_STORAGE - 阶段三：磁盘挂载与文件系统"

ROOT_RECOVERY=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"node_type\": \"step\",
  \"title\": \"阶段四：内核自动恢复机制\",
  \"description\": \"内核层面的自动错误检测与恢复机制：OOM Killer、Watchdog(soft/hard lockup)、Panic与Kdump、日志回放(Journal Replay)、设备Reset与PCIe AER。\",
  \"sort_order\": 3
}")
echo "ROOT_RECOVERY=$ROOT_RECOVERY - 阶段四：内核自动恢复机制"

# =========================================
# 模块一：Linux启动流程 - 7 步（作为 ROOT_BOOT 的子节点）
# =========================================
echo "--- 模块一：Linux启动流程子节点 ---"

N1_1=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$ROOT_BOOT\",
  \"node_type\": \"step\",
  \"title\": \"BIOS/UEFI固件初始化\",
  \"description\": \"加电自检(POST)、硬件初始化、枚举PCI设备、选择启动设备。UEFI模式通过ESP分区加载EFI应用程序。\",
  \"sort_order\": 0
}")
echo "N1_1=$N1_1 - BIOS/UEFI固件初始化"

N1_2=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$ROOT_BOOT\",
  \"node_type\": \"step\",
  \"title\": \"GRUB2引导加载\",
  \"description\": \"GRUB从ESP或MBR加载，读取grub.cfg，显示启动菜单，加载内核镜像(vmlinuz)和initrd到内存。\",
  \"sort_order\": 1
}")
echo "N1_2=$N1_2 - GRUB2引导加载"

N1_2_1=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$N1_2\",
  \"node_type\": \"exception\",
  \"title\": \"GRUB配置错误导致引导失败\",
  \"description\": \"grub.cfg语法错误、内核路径写错、或grub-install未正确写入引导扇区。\",
  \"sort_order\": 0
}")
echo "  N1_2_1=$N1_2_1 - GRUB异常"

N1_2_2=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$N1_2\",
  \"node_type\": \"pitfall_ref\",
  \"title\": \"root=参数指定错误\",
  \"description\": \"GRUB传给内核的root=参数不正确，后续将导致VFS panic。\",
  \"sort_order\": 1
}")
echo "  N1_2_2=$N1_2_2 - root=参数坑引用"

N1_3=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$ROOT_BOOT\",
  \"node_type\": \"step\",
  \"title\": \"内核解压与早期初始化\",
  \"description\": \"内核自解压(decompress_kernel)，设置页表、初始化内存管理(memblock)、解析cmdline参数、初始化console输出。\",
  \"sort_order\": 2
}")
echo "N1_3=$N1_3 - 内核解压与早期初始化"

N1_4=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$ROOT_BOOT\",
  \"node_type\": \"step\",
  \"title\": \"内核子系统初始化\",
  \"description\": \"start_kernel()→rest_init()：初始化调度器、中断、PCI总线、SCSI子系统、网络协议栈。按initcall级别依次调用驱动的module_init。\",
  \"sort_order\": 3
}")
echo "N1_4=$N1_4 - 内核子系统初始化"

N1_4_1=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$N1_4\",
  \"node_type\": \"exception\",
  \"title\": \"模块加载顺序导致probe失败\",
  \"description\": \"initcall级别不当或模块间依赖未声明，导致驱动probe时依赖的子系统尚未就绪。\",
  \"sort_order\": 0
}")
echo "  N1_4_1=$N1_4_1 - 模块加载顺序异常"

N1_5=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$ROOT_BOOT\",
  \"node_type\": \"step\",
  \"title\": \"initrd/initramfs加载\",
  \"description\": \"内核解压initramfs到rootfs(tmpfs)，执行/init脚本。initrd负责加载根文件系统所需的驱动（存储、文件系统模块），并准备switch_root环境。\",
  \"sort_order\": 4
}")
echo "N1_5=$N1_5 - initrd/initramfs加载"

N1_5_1=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$N1_5\",
  \"node_type\": \"pitfall_ref\",
  \"title\": \"initrd缺少关键驱动\",
  \"description\": \"initramfs未包含目标存储控制器驱动，导致无法发现根设备。\",
  \"sort_order\": 0
}")
echo "  N1_5_1=$N1_5_1 - initrd缺模块坑引用"

N1_5_2=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$N1_5\",
  \"node_type\": \"exception\",
  \"title\": \"dracut/mkinitcpio配置不当\",
  \"description\": \"dracut hostonly模式遗漏模块、或mkinitcpio HOOKS配置错误，导致生成的initramfs不完整。\",
  \"sort_order\": 1
}")
echo "  N1_5_2=$N1_5_2 - dracut配置异常"

N1_6=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$ROOT_BOOT\",
  \"node_type\": \"step\",
  \"title\": \"rootfs切换(switch_root)\",
  \"description\": \"initrd中的init脚本挂载真正的根文件系统，通过switch_root或pivot_root切换根目录，释放initramfs内存。\",
  \"sort_order\": 5
}")
echo "N1_6=$N1_6 - rootfs切换"

N1_6_1=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$N1_6\",
  \"node_type\": \"pitfall_ref\",
  \"title\": \"VFS无法挂载根文件系统\",
  \"description\": \"switch_root阶段找不到根文件系统，导致kernel panic。\",
  \"sort_order\": 0
}")
echo "  N1_6_1=$N1_6_1 - VFS panic坑引用"

N1_6_2=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$N1_6\",
  \"node_type\": \"exception\",
  \"title\": \"启动OOM导致switch_root失败\",
  \"description\": \"内存过小或initramfs占用过多内存，导致挂载根文件系统时OOM。\",
  \"sort_order\": 1
}")
echo "  N1_6_2=$N1_6_2 - 启动OOM异常"

N1_7=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$ROOT_BOOT\",
  \"node_type\": \"step\",
  \"title\": \"systemd用户态初始化\",
  \"description\": \"PID 1(systemd)接管，按依赖关系并行启动服务单元。挂载fstab中的文件系统、启动网络、登录管理器等。达到default.target标志启动完成。\",
  \"sort_order\": 6
}")
echo "N1_7=$N1_7 - systemd用户态初始化"

N1_7_1=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$N1_7\",
  \"node_type\": \"pitfall_ref\",
  \"title\": \"fstab配置错误阻塞启动\",
  \"description\": \"fstab中挂载项错误导致systemd mount unit失败，系统进入emergency模式。\",
  \"sort_order\": 0
}")
echo "  N1_7_1=$N1_7_1 - fstab坑引用"

N1_7_2=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$N1_7\",
  \"node_type\": \"exception\",
  \"title\": \"systemd循环依赖导致启动超时\",
  \"description\": \"自定义unit之间循环依赖导致启动顺序死锁。\",
  \"sort_order\": 1
}")
echo "  N1_7_2=$N1_7_2 - systemd循环依赖异常"

# =========================================
# 模块二：SATA控制器驱动 - 主干 5 步 + 4 分支（作为 ROOT_SATA 的子节点）
# =========================================
echo "--- 模块二：SATA控制器驱动子节点 ---"

N2_1=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$ROOT_SATA\",
  \"node_type\": \"step\",
  \"title\": \"libata框架初始化\",
  \"description\": \"libata作为Linux SATA/PATA的统一框架，在内核初始化阶段注册SCSI host template。提供ATA命令翻译层(SAT)、错误处理框架、电源管理接口。\",
  \"sort_order\": 0
}")
echo "N2_1=$N2_1 - libata框架初始化"

N2_2=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$ROOT_SATA\",
  \"node_type\": \"step\",
  \"title\": \"AHCI PCI Probe\",
  \"description\": \"ahci驱动匹配PCI Vendor/Device ID，映射AHCI BAR空间，读取HBA Capabilities(CAP)寄存器，初始化每个端口的Command List和FIS Receive区域。\",
  \"sort_order\": 1
}")
echo "N2_2=$N2_2 - AHCI PCI Probe"

N2_2_1=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$N2_2\",
  \"node_type\": \"pitfall_ref\",
  \"title\": \"AHCI控制器PCI ID不匹配\",
  \"description\": \"新AHCI控制器的PCI ID未加入ahci_pci_tbl，或BIOS设置为非AHCI模式。\",
  \"sort_order\": 0
}")
echo "  N2_2_1=$N2_2_1 - AHCI未识别坑引用"

N2_3=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$ROOT_SATA\",
  \"node_type\": \"step\",
  \"title\": \"端口与链路建立\",
  \"description\": \"AHCI端口执行COMRESET发起OOB信号序列，与设备进行速率协商(Gen1/2/3)，建立SATA物理链路。成功后端口状态从offline变为online。\",
  \"sort_order\": 2
}")
echo "N2_3=$N2_3 - 端口与链路建立"

N2_3_1=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$N2_3\",
  \"node_type\": \"pitfall_ref\",
  \"title\": \"链路训练超时\",
  \"description\": \"OOB信号序列或速率协商失败导致链路无法建立。\",
  \"sort_order\": 0
}")
echo "  N2_3_1=$N2_3_1 - 链路训练超时坑引用"

N2_3_2=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$N2_3\",
  \"node_type\": \"exception\",
  \"title\": \"FIS接收CRC错误\",
  \"description\": \"物理层信号完整性问题导致FIS校验失败，影响链路稳定性。\",
  \"sort_order\": 1
}")
echo "  N2_3_2=$N2_3_2 - FIS接收错误异常"

N2_4=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$ROOT_SATA\",
  \"node_type\": \"step\",
  \"title\": \"设备识别(IDENTIFY DEVICE)\",
  \"description\": \"链路建立后发送IDENTIFY DEVICE/IDENTIFY PACKET DEVICE命令，获取设备型号、固件版本、容量、支持的特性(NCQ/TRIM/APM等)，注册SCSI设备(sd*)。\",
  \"sort_order\": 3
}")
echo "N2_4=$N2_4 - 设备识别"

N2_5=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$ROOT_SATA\",
  \"node_type\": \"step\",
  \"title\": \"命令处理与I/O路径\",
  \"description\": \"上层SCSI命令经SAT翻译为ATA命令，通过AHCI Command List下发。NCQ命令使用FPDMA机制允许最多32条命令同时处理。命令完成后通过中断通知驱动。\",
  \"sort_order\": 4
}")
echo "N2_5=$N2_5 - 命令处理与I/O路径"

N2_5_1=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$N2_5\",
  \"node_type\": \"pitfall_ref\",
  \"title\": \"NCQ命令错误\",
  \"description\": \"NCQ命令报错后队列深度降级，I/O性能急剧下降。\",
  \"sort_order\": 0
}")
echo "  N2_5_1=$N2_5_1 - NCQ错误坑引用"

# SATA分支：Error Handler
N2_B1=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$ROOT_SATA\",
  \"node_type\": \"step\",
  \"title\": \"Error Handler (EH)\",
  \"description\": \"libata EH是SATA错误恢复的核心机制。当命令超时或设备报告错误时，所有端口I/O暂停，EH线程接管进行错误分析和恢复。\",
  \"sort_order\": 5
}")
echo "N2_B1=$N2_B1 - Error Handler"

N2_B1_1=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$N2_B1\",
  \"node_type\": \"step\",
  \"title\": \"EH Step 1: 错误分类\",
  \"description\": \"分析SError寄存器、Task File Status、AHCI PxIS中断状态，将错误分类为：设备错误(ATA_DEV_ERR)、HSM违例、超时、链路错误等。\",
  \"sort_order\": 0
}")
echo "  N2_B1_1=$N2_B1_1 - EH错误分类"

N2_B1_2=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$N2_B1\",
  \"node_type\": \"step\",
  \"title\": \"EH Step 2: Reset序列\",
  \"description\": \"按级别尝试恢复：SRST(Soft Reset) → COMRESET(Hard Reset) → Port Reset。每级失败后升级到下一级，最多重试ATA_MAX_EH_TRIES(5)次。\",
  \"sort_order\": 1
}")
echo "  N2_B1_2=$N2_B1_2 - EH Reset序列"

N2_B1_3=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$N2_B1\",
  \"node_type\": \"step\",
  \"title\": \"EH Step 3: 恢复或放弃\",
  \"description\": \"Reset成功后重新IDENTIFY设备并恢复I/O。若所有Reset均失败，设备被标记为disabled(offline)，对应SCSI设备离线。\",
  \"sort_order\": 2
}")
echo "  N2_B1_3=$N2_B1_3 - EH恢复或放弃"

N2_B1_3_1=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$N2_B1_3\",
  \"node_type\": \"pitfall_ref\",
  \"title\": \"连续Reset失败设备离线\",
  \"description\": \"命令超时后所有级别的reset都无法恢复设备。\",
  \"sort_order\": 0
}")
echo "    N2_B1_3_1=$N2_B1_3_1 - 连续reset失败坑引用"

# SATA分支：热插拔
N2_B2=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$ROOT_SATA\",
  \"node_type\": \"step\",
  \"title\": \"热插拔处理\",
  \"description\": \"AHCI端口检测到设备插入(PxSERR.DIAG.X)或拔出(PxSERR.DIAG.N)事件后，通过AHCI中断通知驱动。插入触发链路建立+设备识别，拔出触发SCSI设备移除。\",
  \"sort_order\": 6
}")
echo "N2_B2=$N2_B2 - 热插拔处理"

N2_B2_1=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$N2_B2\",
  \"node_type\": \"pitfall_ref\",
  \"title\": \"热插拔导致数据不一致\",
  \"description\": \"不支持SNotification的控制器上热插拔可能导致数据丢失。\",
  \"sort_order\": 0
}")
echo "  N2_B2_1=$N2_B2_1 - 热插拔坑引用"

# SATA分支：电源管理
N2_B3=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$ROOT_SATA\",
  \"node_type\": \"step\",
  \"title\": \"电源管理\",
  \"description\": \"SATA电源管理包含多个级别：Active → Partial(快速恢复) → Slumber(深度节能) → DevSleep(最深节能)。通过ALPM(Aggressive Link Power Management)自动管理链路状态。\",
  \"sort_order\": 7
}")
echo "N2_B3=$N2_B3 - 电源管理"

N2_B3_1=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$N2_B3\",
  \"node_type\": \"pitfall_ref\",
  \"title\": \"ALPM导致链路不稳定\",
  \"description\": \"频繁的Partial/Slumber切换引发链路错误。\",
  \"sort_order\": 0
}")
echo "  N2_B3_1=$N2_B3_1 - ALPM坑引用"

N2_B3_2=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$N2_B3\",
  \"node_type\": \"pitfall_ref\",
  \"title\": \"DevSleep唤醒超时\",
  \"description\": \"从DevSleep状态唤醒设备时超时失败。\",
  \"sort_order\": 1
}")
echo "  N2_B3_2=$N2_B3_2 - DevSleep坑引用"

# SATA分支：DFX手段
N2_B4=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$ROOT_SATA\",
  \"node_type\": \"step\",
  \"title\": \"DFX调试手段\",
  \"description\": \"SATA/AHCI问题排查工具集：dmesg日志分析、/sys/class/ata_*节点、smartctl SMART数据、AHCI寄存器dump、libata动态debug(echo 1 > /sys/module/libata/parameters/*)、blktrace I/O跟踪。\",
  \"sort_order\": 8
}")
echo "N2_B4=$N2_B4 - DFX调试手段"

# =========================================
# 模块三：磁盘挂载与文件系统 - 6 步（作为 ROOT_STORAGE 的子节点）
# =========================================
echo "--- 模块三：磁盘挂载与文件系统子节点 ---"

N4_1=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$ROOT_STORAGE\",
  \"node_type\": \"step\",
  \"title\": \"块设备发现\",
  \"description\": \"内核通过驱动probe发现块设备（SCSI sd、NVMe、virtio-blk等），在/dev下创建块设备节点。udev规则根据设备属性创建符号链接(/dev/disk/by-id、by-uuid等)。\",
  \"sort_order\": 0
}")
echo "N4_1=$N4_1 - 块设备发现"

N4_2=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$ROOT_STORAGE\",
  \"node_type\": \"step\",
  \"title\": \"分区表扫描\",
  \"description\": \"块设备发现后，内核读取前几个扇区解析分区表(MBR/GPT)。每个分区注册为独立块设备(sda1,sda2...)。GPT使用备份分区表提供冗余。\",
  \"sort_order\": 1
}")
echo "N4_2=$N4_2 - 分区表扫描"

N4_3=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$ROOT_STORAGE\",
  \"node_type\": \"step\",
  \"title\": \"文件系统类型探测\",
  \"description\": \"mount命令或blkid读取分区超级块(superblock)中的magic number识别文件系统类型。ext4在偏移0x438处有0xEF53标识，xfs在偏移0处有XFSB标识。\",
  \"sort_order\": 2
}")
echo "N4_3=$N4_3 - 文件系统类型探测"

N4_4=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$ROOT_STORAGE\",
  \"node_type\": \"step\",
  \"title\": \"mount与VFS层\",
  \"description\": \"mount系统调用通过VFS(Virtual File System)层：查找文件系统类型→调用fs_type.mount()→创建super_block→挂载到目录树。VFS提供统一的inode/dentry/file接口抽象不同文件系统。\",
  \"sort_order\": 3
}")
echo "N4_4=$N4_4 - mount与VFS层"

N4_4_1=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$N4_4\",
  \"node_type\": \"pitfall_ref\",
  \"title\": \"fstab配置错误\",
  \"description\": \"fstab中UUID错误或挂载选项不兼容导致mount失败。\",
  \"sort_order\": 0
}")
echo "  N4_4_1=$N4_4_1 - fstab配置坑引用(跨树)"

N4_4_2=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$N4_4\",
  \"node_type\": \"exception\",
  \"title\": \"掉电后文件系统损坏无法挂载\",
  \"description\": \"非正常关机导致文件系统元数据不一致，mount失败需要fsck修复。\",
  \"sort_order\": 1
}")
echo "  N4_4_2=$N4_4_2 - 掉电FS损坏异常"

N4_5=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$ROOT_STORAGE\",
  \"node_type\": \"step\",
  \"title\": \"I/O读写操作\",
  \"description\": \"应用read/write→VFS→文件系统(ext4_file_write_iter)→块层(bio提交)→I/O调度器→块设备驱动→硬件。Page Cache和Buffer Cache缓存热点数据减少磁盘I/O。\",
  \"sort_order\": 4
}")
echo "N4_5=$N4_5 - I/O读写操作"

N4_5_1=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$N4_5\",
  \"node_type\": \"pitfall_ref\",
  \"title\": \"I/O调度器选择不当\",
  \"description\": \"HDD用none调度器或SSD用cfq导致性能问题。\",
  \"sort_order\": 0
}")
echo "  N4_5_1=$N4_5_1 - I/O调度器坑引用"

N4_5_2=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$N4_5\",
  \"node_type\": \"exception\",
  \"title\": \"持续I/O错误导致FS离线\",
  \"description\": \"底层设备错误累积导致文件系统被强制转为只读或卸载。\",
  \"sort_order\": 1
}")
echo "  N4_5_2=$N4_5_2 - I/O错误FS离线异常"

N4_6=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$ROOT_STORAGE\",
  \"node_type\": \"step\",
  \"title\": \"卸载与同步\",
  \"description\": \"umount触发：sync刷写Page Cache脏页→文件系统commit日志→释放super_block→从挂载树移除。强制卸载(umount -l)延迟释放，但可能丢失未刷数据。\",
  \"sort_order\": 5
}")
echo "N4_6=$N4_6 - 卸载与同步"

# =========================================
# 模块四：内核自动恢复机制 - 6 步（作为 ROOT_RECOVERY 的子节点）
# =========================================
echo "--- 模块四：内核自动恢复机制子节点 ---"

N3_1=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$ROOT_RECOVERY\",
  \"node_type\": \"step\",
  \"title\": \"错误检测概览\",
  \"description\": \"Linux内核通过多层机制检测和恢复错误：内存管理(OOM Killer)、CPU监控(Watchdog)、致命错误(Panic+Kdump)、文件系统日志(Journal Replay)、硬件错误(PCIe AER/设备Reset)。\",
  \"sort_order\": 0
}")
echo "N3_1=$N3_1 - 错误检测概览"

N3_2=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$ROOT_RECOVERY\",
  \"node_type\": \"step\",
  \"title\": \"OOM Killer\",
  \"description\": \"当系统可用内存+swap耗尽时，OOM Killer根据oom_score(基于内存使用量、运行时间、权限等)选择进程kill释放内存。受oom_score_adj和cgroup memory.oom控制。\",
  \"sort_order\": 1
}")
echo "N3_2=$N3_2 - OOM Killer"

N3_2_1=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$N3_2\",
  \"node_type\": \"pitfall_ref\",
  \"title\": \"OOM误杀关键进程\",
  \"description\": \"OOM Killer根据评分选择了关键业务进程而非内存泄漏进程。\",
  \"sort_order\": 0
}")
echo "  N3_2_1=$N3_2_1 - OOM误杀坑引用"

N3_3=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$ROOT_RECOVERY\",
  \"node_type\": \"step\",
  \"title\": \"Watchdog检测(Soft/Hard Lockup)\",
  \"description\": \"softlockup: hrtimer定期检查CPU是否20秒内未调度。hardlockup: NMI watchdog通过PMU检查CPU是否10秒内未响应中断。检测到后输出堆栈并可配置为panic。\",
  \"sort_order\": 2
}")
echo "N3_3=$N3_3 - Watchdog检测"

N3_3_1=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$N3_3\",
  \"node_type\": \"pitfall_ref\",
  \"title\": \"softlockup误报\",
  \"description\": \"正常的长时间不可抢占计算被误判为死锁。\",
  \"sort_order\": 0
}")
echo "  N3_3_1=$N3_3_1 - softlockup误报坑引用"

N3_3_2=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$N3_3\",
  \"node_type\": \"pitfall_ref\",
  \"title\": \"hardlockup在虚拟机中不可用\",
  \"description\": \"虚拟化环境下PMU未暴露导致hardlockup检测失效。\",
  \"sort_order\": 1
}")
echo "  N3_3_2=$N3_3_2 - hardlockup不可用坑引用"

N3_4=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$ROOT_RECOVERY\",
  \"node_type\": \"step\",
  \"title\": \"Panic与Kdump\",
  \"description\": \"kernel panic时：输出错误信息到console，触发panic_notifier_list回调，若配置了kexec则启动capture kernel采集vmcore。panic_timeout控制是否自动重启。\",
  \"sort_order\": 3
}")
echo "N3_4=$N3_4 - Panic与Kdump"

N3_4_1=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$N3_4\",
  \"node_type\": \"pitfall_ref\",
  \"title\": \"kdump采集失败\",
  \"description\": \"capture kernel启动失败导致无法生成vmcore进行事后分析。\",
  \"sort_order\": 0
}")
echo "  N3_4_1=$N3_4_1 - kdump失败坑引用"

N3_5=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$ROOT_RECOVERY\",
  \"node_type\": \"step\",
  \"title\": \"Journal Replay(日志回放)\",
  \"description\": \"文件系统在非正常卸载后挂载时自动回放日志：ext4的JBD2日志、xfs的log recovery、btrfs的log tree。回放恢复到最后一致状态，保证元数据完整性。\",
  \"sort_order\": 4
}")
echo "N3_5=$N3_5 - Journal Replay"

N3_5_1=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$N3_5\",
  \"node_type\": \"pitfall_ref\",
  \"title\": \"ext4日志回放失败\",
  \"description\": \"日志区域损坏导致回放失败，文件系统无法挂载。\",
  \"sort_order\": 0
}")
echo "  N3_5_1=$N3_5_1 - journal replay失败坑引用"

N3_6=$(create "$API/tree-nodes" "{
  \"tree_id\": \"$T1\",
  \"parent_id\": \"$ROOT_RECOVERY\",
  \"node_type\": \"step\",
  \"title\": \"设备Reset与PCIe AER\",
  \"description\": \"PCIe AER(Advanced Error Reporting)检测到设备错误后，按严重程度执行：Correctable→仅记录、Uncorrectable Non-Fatal→function reset、Fatal→链路reset。SATA控制器作为PCIe设备也受AER管理。\",
  \"sort_order\": 5
}")
echo "N3_6=$N3_6 - 设备Reset与PCIe AER"

echo ""
echo "=== Phase 4: 关联坑到节点 ==="

# 模块一关联
post "$API/tree-nodes/$N1_2_1/pitfalls" "{\"pitfall_id\": \"$P3\"}"
echo "  P3(GRUB配置错误) → N1_2_1(GRUB配置异常)"

post "$API/tree-nodes/$N1_2_2/pitfalls" "{\"pitfall_id\": \"$P2\"}"
echo "  P2(root=参数错误) → N1_2_2"

post "$API/tree-nodes/$N1_4_1/pitfalls" "{\"pitfall_id\": \"$P5\"}"
echo "  P5(模块加载顺序) → N1_4_1"

post "$API/tree-nodes/$N1_5_1/pitfalls" "{\"pitfall_id\": \"$P1\"}"
echo "  P1(initrd缺模块) → N1_5_1"

post "$API/tree-nodes/$N1_5_2/pitfalls" "{\"pitfall_id\": \"$P4\"}"
echo "  P4(dracut配置) → N1_5_2"

post "$API/tree-nodes/$N1_6_1/pitfalls" "{\"pitfall_id\": \"$P9\"}"
echo "  P9(VFS panic) → N1_6_1"

post "$API/tree-nodes/$N1_6_2/pitfalls" "{\"pitfall_id\": \"$P8\"}"
echo "  P8(启动OOM) → N1_6_2"

post "$API/tree-nodes/$N1_7_1/pitfalls" "{\"pitfall_id\": \"$P6\"}"
echo "  P6(fstab错误) → N1_7_1"

post "$API/tree-nodes/$N1_7_2/pitfalls" "{\"pitfall_id\": \"$P7\"}"
echo "  P7(systemd循环依赖) → N1_7_2"

# 模块二关联
post "$API/tree-nodes/$N2_2_1/pitfalls" "{\"pitfall_id\": \"$P11\"}"
echo "  P11(AHCI未识别) → N2_2_1"

post "$API/tree-nodes/$N2_3_1/pitfalls" "{\"pitfall_id\": \"$P10\"}"
echo "  P10(链路训练超时) → N2_3_1"

post "$API/tree-nodes/$N2_3_2/pitfalls" "{\"pitfall_id\": \"$P16\"}"
echo "  P16(FIS接收错误) → N2_3_2"

post "$API/tree-nodes/$N2_5_1/pitfalls" "{\"pitfall_id\": \"$P12\"}"
echo "  P12(NCQ错误) → N2_5_1"

post "$API/tree-nodes/$N2_B1_3_1/pitfalls" "{\"pitfall_id\": \"$P17\"}"
echo "  P17(连续reset失败) → N2_B1_3_1"

post "$API/tree-nodes/$N2_B2_1/pitfalls" "{\"pitfall_id\": \"$P13\"}"
echo "  P13(热插拔数据丢失) → N2_B2_1"

post "$API/tree-nodes/$N2_B3_1/pitfalls" "{\"pitfall_id\": \"$P14\"}"
echo "  P14(ALPM不稳定) → N2_B3_1"

post "$API/tree-nodes/$N2_B3_2/pitfalls" "{\"pitfall_id\": \"$P15\"}"
echo "  P15(DevSleep唤醒) → N2_B3_2"

# 模块三关联
post "$API/tree-nodes/$N4_4_1/pitfalls" "{\"pitfall_id\": \"$P6\"}"
echo "  P6(fstab配置错误) → N4_4_1 ★跨模块引用：同时被模块一和模块三引用"

post "$API/tree-nodes/$N4_4_2/pitfalls" "{\"pitfall_id\": \"$P18\"}"
echo "  P18(掉电FS损坏) → N4_4_2"

post "$API/tree-nodes/$N4_5_1/pitfalls" "{\"pitfall_id\": \"$P19\"}"
echo "  P19(I/O调度器) → N4_5_1"

post "$API/tree-nodes/$N4_5_2/pitfalls" "{\"pitfall_id\": \"$P20\"}"
echo "  P20(I/O错误FS离线) → N4_5_2"

# 模块四关联
post "$API/tree-nodes/$N3_2_1/pitfalls" "{\"pitfall_id\": \"$P22\"}"
echo "  P22(OOM误杀) → N3_2_1"

post "$API/tree-nodes/$N3_3_1/pitfalls" "{\"pitfall_id\": \"$P23\"}"
echo "  P23(softlockup误报) → N3_3_1"

post "$API/tree-nodes/$N3_3_2/pitfalls" "{\"pitfall_id\": \"$P24\"}"
echo "  P24(hardlockup不可用) → N3_3_2"

post "$API/tree-nodes/$N3_4_1/pitfalls" "{\"pitfall_id\": \"$P25\"}"
echo "  P25(kdump失败) → N3_4_1"

post "$API/tree-nodes/$N3_5_1/pitfalls" "{\"pitfall_id\": \"$P21\"}"
echo "  P21(journal replay失败) → N3_5_1"

echo ""
echo "=== Phase 5: 创建 3 个任务 ==="

TASK1_ID=$(create "$API/tasks" '{
  "title": "排查SATA控制器命令超时问题",
  "description": "生产环境中某型号SATA SSD频繁出现命令超时(30秒timeout)，EH触发后soft reset恢复但很快复现。需排查根因：是SSD固件bug、链路信号问题、还是驱动兼容性问题。要求输出排查报告和解决方案。",
  "assignee": "张工",
  "assigned_by": "李组长",
  "modules": ["sata"],
  "due_date": "2026-03-25"
}' '.task.id')
echo "Task1=$TASK1_ID - 排查SATA控制器命令超时问题"

TASK2_ID=$(create "$API/tasks" '{
  "title": "优化嵌入式设备Linux启动速度",
  "description": "当前嵌入式ARM设备Linux启动耗时28秒（从GRUB到登录），目标优化到15秒以内。重点排查initramfs大小、systemd服务依赖、模块加载顺序。输出优化方案和A/B对比数据。",
  "assignee": "王工",
  "assigned_by": "李组长",
  "modules": ["linux-boot"],
  "due_date": "2026-04-01"
}' '.task.id')
echo "Task2=$TASK2_ID - 优化嵌入式设备Linux启动速度"

TASK3_ID=$(create "$API/tasks" '{
  "title": "提升存储子系统可靠性方案设计",
  "description": "针对数据中心存储服务器场景，设计存储子系统可靠性提升方案。覆盖：文件系统选型(ext4 vs xfs vs btrfs)、I/O错误处理策略、掉电保护、内核自动恢复机制集成。输出设计文档和PoC验证报告。",
  "assignee": "赵工",
  "assigned_by": "李组长",
  "modules": ["storage", "kernel-recovery"],
  "due_date": "2026-04-15"
}' '.task.id')
echo "Task3=$TASK3_ID - 提升存储子系统可靠性方案设计 ★跨模块"

echo ""
echo "=== Phase 6: 关联节点到任务 + 添加工件 ==="

# Task 1 关联 SATA EH 和 DFX 相关节点
post "$API/tasks/$TASK1_ID/nodes" "{\"node_id\": \"$N2_B1\"}"
echo "  Task1 ← N2_B1(Error Handler)"
post "$API/tasks/$TASK1_ID/nodes" "{\"node_id\": \"$N2_B1_2\"}"
echo "  Task1 ← N2_B1_2(Reset序列)"
post "$API/tasks/$TASK1_ID/nodes" "{\"node_id\": \"$N2_B4\"}"
echo "  Task1 ← N2_B4(DFX调试手段)"
post "$API/tasks/$TASK1_ID/nodes" "{\"node_id\": \"$N2_5\"}"
echo "  Task1 ← N2_5(命令处理)"

# Task 2 关联启动流程相关节点
post "$API/tasks/$TASK2_ID/nodes" "{\"node_id\": \"$N1_5\"}"
echo "  Task2 ← N1_5(initrd/initramfs)"
post "$API/tasks/$TASK2_ID/nodes" "{\"node_id\": \"$N1_7\"}"
echo "  Task2 ← N1_7(systemd)"
post "$API/tasks/$TASK2_ID/nodes" "{\"node_id\": \"$N1_4\"}"
echo "  Task2 ← N1_4(内核子系统初始化)"

# Task 3 关联存储和恢复相关节点
post "$API/tasks/$TASK3_ID/nodes" "{\"node_id\": \"$N4_4\"}"
echo "  Task3 ← N4_4(mount/VFS)"
post "$API/tasks/$TASK3_ID/nodes" "{\"node_id\": \"$N4_5\"}"
echo "  Task3 ← N4_5(I/O读写)"
post "$API/tasks/$TASK3_ID/nodes" "{\"node_id\": \"$N3_5\"}"
echo "  Task3 ← N3_5(Journal Replay)"
post "$API/tasks/$TASK3_ID/nodes" "{\"node_id\": \"$N3_6\"}"
echo "  Task3 ← N3_6(设备Reset/PCIe AER)"

# 添加工件
post "$API/tasks/$TASK1_ID/artifacts" '{
  "artifact_type": "design_doc",
  "title": "SATA EH机制内核文档",
  "url": "https://www.kernel.org/doc/html/latest/driver-api/libata.html"
}'
echo "  Task1 artifact: SATA EH内核文档"

post "$API/tasks/$TASK1_ID/artifacts" '{
  "artifact_type": "design_doc",
  "title": "AHCI规范1.3.1",
  "url": "https://www.intel.com/content/www/us/en/io/serial-ata/ahci.html"
}'
echo "  Task1 artifact: AHCI规范"

post "$API/tasks/$TASK2_ID/artifacts" '{
  "artifact_type": "design_doc",
  "title": "systemd-analyze启动性能分析指南",
  "url": "https://www.freedesktop.org/software/systemd/man/systemd-analyze.html"
}'
echo "  Task2 artifact: systemd-analyze指南"

post "$API/tasks/$TASK2_ID/artifacts" '{
  "artifact_type": "other",
  "title": "dracut配置手册",
  "url": "https://man7.org/linux/man-pages/man5/dracut.conf.5.html"
}'
echo "  Task2 artifact: dracut配置手册"

post "$API/tasks/$TASK3_ID/artifacts" '{
  "artifact_type": "design_doc",
  "title": "Linux存储栈全景图",
  "url": "https://www.thomas-krenn.com/en/wiki/Linux_Storage_Stack_Diagram"
}'
echo "  Task3 artifact: Linux存储栈全景图"

echo ""
echo "========================================="
echo "数据填充完成！"
echo "========================================="
echo ""
echo "验证命令："
echo "  curl -s $API/knowledge-trees | jq 'length'          # 期望: 1"
echo "  curl -s $API/pitfalls | jq 'length'                 # 期望: 25"
echo "  curl -s $API/tasks | jq 'length'                    # 期望: 3"
echo "  curl -s $API/pitfalls/$P6 | jq '.references | length'  # 期望: 2 (跨模块引用)"
echo ""
echo "前端页面验证："
echo "  http://localhost:3000/knowledge  - 查看1棵统一知识树"
echo "  http://localhost:3000/pitfalls   - 查看25个坑及跨模块引用"
echo "  http://localhost:3000/tasks      - 查看3个任务及自动识别的坑"
