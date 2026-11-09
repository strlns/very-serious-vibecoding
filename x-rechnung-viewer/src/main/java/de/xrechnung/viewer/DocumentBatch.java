package de.xrechnung.viewer;

import java.nio.file.Path;
import java.util.List;

public final class DocumentBatch {
  public record Loaded(Path source, InvoiceFile original, SemanticInvoice invoice) {}

  public record Failure(Path source, String reason) {}

  public record Result(List<Loaded> loaded, List<Failure> failures) {
    public Result {
      loaded = List.copyOf(loaded);
      failures = List.copyOf(failures);
    }
  }

  public static Result load(List<Path> files) {
    var loaded = new java.util.ArrayList<Loaded>();
    var failures = new java.util.ArrayList<Failure>();
    for (Path candidate : List.copyOf(files)) {
      Path path = candidate.toAbsolutePath().normalize();
      try {
        if (!path.getFileName().toString().toLowerCase(java.util.Locale.ROOT).endsWith(".xml"))
          throw new java.io.IOException("Keine XML-Datei (.xml).");
        if (!java.nio.file.Files.isRegularFile(path))
          throw new java.io.IOException("Keine lesbare reguläre Datei.");
        var original = InvoiceFile.open(path);
        loaded.add(new Loaded(path, original, KositMapper.map(original)));
      } catch (Exception ex) {
        failures.add(
            new Failure(
                path, ex.getMessage() == null ? ex.getClass().getSimpleName() : ex.getMessage()));
      }
    }
    return new Result(loaded, failures);
  }

  private DocumentBatch() {}
}
