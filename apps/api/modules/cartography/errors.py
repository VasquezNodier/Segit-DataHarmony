"""Errores del pipeline cartography split."""


class CartographySplitError(Exception):
    """Error base."""

    code = "CARTOGRAPHY_SPLIT_ERROR"

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class CartographySplitValidationError(CartographySplitError):
    code = "VALIDATION_ERROR"


class CartographySplitConflictError(CartographySplitError):
    code = "OUTPUT_CONFLICT"

    def __init__(self, message: str, conflicting_paths: list[str]):
        super().__init__(message)
        self.conflicting_paths = conflicting_paths
