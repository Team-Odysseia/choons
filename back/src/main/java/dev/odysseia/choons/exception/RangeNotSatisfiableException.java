package dev.odysseia.choons.exception;

public class RangeNotSatisfiableException extends RuntimeException {

  private final long totalSize;

  public RangeNotSatisfiableException(long totalSize) {
    super("Requested range is not satisfiable");
    this.totalSize = totalSize;
  }

  public long getTotalSize() {
    return totalSize;
  }
}
