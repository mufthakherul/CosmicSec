"""Parser package — exposes all output parsers for supported tools."""

from __future__ import annotations

from .gobuster_parser import GobusterParser
from .ffuf_parser import FfufParser
from .masscan_parser import MasscanParser
from .hydra_parser import HydraParser
from .nikto_parser import NiktoParser
from .nmap_parser import NmapParser
from .nuclei_parser import NucleiParser
from .sqlmap_parser import SqlmapParser
from .wpscan_parser import WpscanParser
from .zaproxy_parser import ZaproxyParser

__all__ = [
    "NmapParser",
    "NiktoParser",
    "NucleiParser",
    "GobusterParser",
    "SqlmapParser",
    "FfufParser",
    "MasscanParser",
    "HydraParser",
    "WpscanParser",
    "ZaproxyParser",
]
