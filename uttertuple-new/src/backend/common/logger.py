import logging
import os
import shutil
from logging.handlers import TimedRotatingFileHandler

# Get the terminal width
terminal_width = shutil.get_terminal_size().columns

# Set up the logger
logger = logging.getLogger(__name__)

log_dir = os.path.join(os.path.normpath(os.getcwd() + os.sep + os.pardir), "logs")
log_fname = os.path.join(log_dir, "logger.log")

if not os.path.exists(log_dir):
    os.mkdir(log_dir)

# Configure the RichHandler with console width
# shell_handler = RichHandler(console=Console(width=terminal_width))
shell_handler = logging.StreamHandler()
file_handler = TimedRotatingFileHandler(log_fname.strip("."), when="midnight", backupCount=30)
file_handler.suffix = r"%Y-%m-%d-%H-%M-%S.log"

logger.setLevel(logging.DEBUG)
shell_handler.setLevel(logging.DEBUG)
file_handler.setLevel(logging.DEBUG)

# Formatters for shell and file
fmt_shell = "%(message)s"
fmt_file = "%(levelname)4s %(asctime)s [%(filename)s:%(funcName)s:%(lineno)d] %(message)s"

# shell_formatter = logging.Formatter(fmt_shell)
shell_formatter = logging.Formatter(fmt_file)
file_formatter = logging.Formatter(fmt_file)

# Set formatters
shell_handler.setFormatter(shell_formatter)
file_handler.setFormatter(file_formatter)

# Add handlers
logger.addHandler(shell_handler)
logger.addHandler(file_handler)