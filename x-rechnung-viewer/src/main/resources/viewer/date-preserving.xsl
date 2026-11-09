<?xml version="1.0" encoding="UTF-8"?>
<!-- Display adapter: only exact calendar dates are normalized. No time-zone operations. -->
<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
 xmlns:xs="http://www.w3.org/2001/XMLSchema"
 xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100"
 xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100"
 exclude-result-prefixes="xs udt qdt">
 <xsl:template name="date">
  <xsl:variable name="raw" select="string(.)"/>
  <xsl:variable name="text" select="normalize-space($raw)"/>
  <xsl:choose>
   <xsl:when test="matches($text, '^[0-9]{4}-[0-9]{2}-[0-9]{2}$') and $text castable as xs:date">
    <xsl:value-of select="$text"/>
   </xsl:when>
   <xsl:when test="(self::udt:DateTimeString or self::qdt:DateTimeString) and @format='102' and matches($text, '^[0-9]{8}$')">
    <xsl:variable name="iso" select="concat(substring($text,1,4),'-',substring($text,5,2),'-',substring($text,7,2))"/>
    <xsl:value-of select="if ($iso castable as xs:date) then $iso else $raw"/>
   </xsl:when>
   <xsl:otherwise><xsl:value-of select="$raw"/></xsl:otherwise>
  </xsl:choose>
 </xsl:template>
</xsl:stylesheet>
