"""Errores del pipeline horizontes_split."""


class HorizontesSplitError(Exception):
    """Error base."""

    code = "HORIZONTES_SPLIT_ERROR"

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class HorizontesSplitValidationError(HorizontesSplitError):
    code = "VALIDATION_ERROR"


class HorizontesSplitParseError(HorizontesSplitError):
    code = "PARSE_ERROR"


class HorizontesSplitConflictError(HorizontesSplitError):
    code = "OUTPUT_CONFLICT"

    def __init__(self, message: str, conflicting_files: list[str]):
        super().__init__(message)
        self.conflicting_files = conflicting_files
