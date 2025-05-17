# reverse_engineering/binary_patcher.py

import hashlib
import os
import shutil
from capstone import *
from lief import ELF, PE, MachO
from difflib import unified_diff
from utils.logger import logger
from llm.offline_chat import ask_ai

SUPPORTED_FORMATS = ['.exe', '.dll', '.bin', '.so', '.elf', '.macho']


def calculate_hashes(filepath):
    with open(filepath, 'rb') as f:
        data = f.read()
    return {
        "md5": hashlib.md5(data).hexdigest(),
        "sha1": hashlib.sha1(data).hexdigest(),
        "sha256": hashlib.sha256(data).hexdigest()
    }


def backup_binary(filepath):
    backup_path = filepath + ".bak"
    shutil.copy(filepath, backup_path)
    logger.info(f"[Backup] Original binary saved to {backup_path}")
    return backup_path


def suggest_patch_via_ai(disassembly, goal="bypass login"):
    prompt = f"You are analyzing binary assembly code. Here's the disassembly:\n\n{disassembly}\n\nGoal: {goal}\n\nSuggest a patch (instruction changes, offsets, ideas):"
    return ask_ai(prompt)


def patch_binary(filepath, offset, new_bytes):
    with open(filepath, 'r+b') as f:
        f.seek(offset)
        f.write(new_bytes)
    logger.success(f"[Patched] Offset {hex(offset)} updated with: {new_bytes.hex()}")


def disassemble_binary(filepath, arch='x86', mode='32'):
    with open(filepath, 'rb') as f:
        code = f.read()

    if arch == 'x86':
        md = Cs(CS_ARCH_X86, CS_MODE_32 if mode == '32' else CS_MODE_64)
    else:
        logger.warning(f"[Disassembler] Unsupported arch: {arch}")
        return ""

    instructions = []
    for i in md.disasm(code, 0x0):
        instructions.append(f"{i.address:08x}: {i.mnemonic} {i.op_str}")
    return instructions


def auto_nop_patterns(instructions, pattern_keywords=['call', 'jmp']):
    nop_offsets = []
    for line in instructions:
        if any(keyword in line for keyword in pattern_keywords):
            offset = int(line.split(':')[0], 16)
            nop_offsets.append(offset)
    return nop_offsets


def generate_diff(original, modified):
    return list(unified_diff(original, modified, fromfile='original', tofile='modified', lineterm=''))


def patch_diff_visualizer(original_instructions, modified_instructions):
    diff = generate_diff(original_instructions, modified_instructions)
    logger.info("[Patch Diff] Showing changes between original and patched disassembly:")
    for line in diff:
        if line.startswith('+') or line.startswith('-'):
            print(line)


def edit_elf_section(filepath, section_name, new_bytes):
    binary = ELF.parse(filepath)
    section = binary.get_section(section_name)
    if not section:
        logger.error(f"[ELF] Section {section_name} not found")
        return
    section.content = list(new_bytes)
    binary.write(filepath)
    logger.success(f"[ELF] Section {section_name} edited")


def auto_patch_via_ai(filepath, disassembly, goal):
    suggestion = suggest_patch_via_ai('\n'.join(disassembly[:300]), goal)
    logger.info(f"[AI Auto-Patch] Suggestion:\n{suggestion}")
    return suggestion  # In future, parse and apply this automatically


def analyze_and_patch(filepath, patch_goal):
    ext = os.path.splitext(filepath)[1].lower()
    if ext not in SUPPORTED_FORMATS:
        logger.error(f"[Format] Unsupported binary type: {ext}")
        return

    hashes_before = calculate_hashes(filepath)
    logger.info(f"[Hash Before] {hashes_before}")

    backup_binary(filepath)
    disasm_list = disassemble_binary(filepath)
    logger.info("[Disassembly] First 100 instructions:\n" + '\n'.join(disasm_list[:100]))

    ai_suggestion = suggest_patch_via_ai('\n'.join(disasm_list[:400]), goal=patch_goal)
    logger.info(f"[AI Suggestion]\n{ai_suggestion}")

    # Show diff visualizer after manual patching
    offset = int(input("Enter offset to patch (hex): "), 16)
    new_hex = input("Enter new bytes (e.g., 90 90 90): ").replace(" ", "")
    patch_binary(filepath, offset, bytes.fromhex(new_hex))

    disasm_after = disassemble_binary(filepath)
    patch_diff_visualizer(disasm_list, disasm_after)

    hashes_after = calculate_hashes(filepath)
    logger.info(f"[Hash After] {hashes_after}")

    if hashes_before['sha256'] == hashes_after['sha256']:
        logger.warning("[Patch] No change detected.")
    else:
        logger.success("[Patch] Binary was successfully modified.")


if __name__ == "__main__":
    path = input("Enter binary path: ").strip()
    goal = input("What is your patch goal? (e.g., 'bypass auth'): ")
    analyze_and_patch(path, goal)
