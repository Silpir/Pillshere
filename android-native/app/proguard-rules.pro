# Room generates code at build time; keep entity accessors.
-keepattributes *Annotation*, InnerClasses, Signature, EnclosingMethod
# Kotlin metadata for reflection-based interop (none used in v1).
-keep class kotlin.Metadata { *; }
