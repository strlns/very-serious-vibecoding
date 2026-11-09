<?xml version="1.0" encoding="UTF-8"?>
<!-- Local display correction; upstream KoSIT resources remain unchanged.
     BT-149/150: the net price basis quantity and its own unitCode.
     No arithmetic or inferred defaults. Other gross-price data remain inspectable. -->
<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
 xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
 xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
 xmlns:xr="urn:ce.eu:en16931:2017:xoev-de:kosit:standard:xrechnung-1">
 <xsl:import href="../kosit-3.0.1/xsl/cii-xr.xsl"/>
 <xsl:include href="date-preserving.xsl"/>
 <xsl:template mode="BG-29" priority="10"
  match="/rsm:CrossIndustryInvoice/rsm:SupplyChainTradeTransaction/ram:IncludedSupplyChainTradeLineItem/ram:SpecifiedLineTradeAgreement[ram:NetPriceProductTradePrice/ram:BasisQuantity]">
  <xr:PRICE_DETAILS xr:id="BG-29" xr:src="{xr:src-path(.)}">
   <xsl:apply-templates mode="BT-146" select="ram:NetPriceProductTradePrice/ram:ChargeAmount"/>
   <xsl:apply-templates mode="BT-147" select="ram:GrossPriceProductTradePrice/ram:AppliedTradeAllowanceCharge/ram:ActualAmount"/>
   <xsl:apply-templates mode="BT-148" select="ram:GrossPriceProductTradePrice/ram:ChargeAmount"/>
   <xsl:for-each select="ram:NetPriceProductTradePrice/ram:BasisQuantity">
    <xr:Item_price_base_quantity xr:id="BT-149" xr:src="{xr:src-path(.)}"><xsl:call-template name="quantity"/></xr:Item_price_base_quantity>
    <xsl:for-each select="@unitCode">
     <xr:Item_price_base_quantity_unit_of_measure xr:id="BT-150" xr:src="{xr:src-path(.)}"><xsl:call-template name="code"/></xr:Item_price_base_quantity_unit_of_measure>
    </xsl:for-each>
   </xsl:for-each>
  </xr:PRICE_DETAILS>
 </xsl:template>
</xsl:stylesheet>
