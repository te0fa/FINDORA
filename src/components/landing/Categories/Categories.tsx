"use client";

import React from "react";
import styles from "./Categories.module.css";
import { useIntersection } from "@/hooks/useIntersection";

interface CategoriesProps {
  dict: any;
  locale: string;
  isRTL: boolean;
}

export default function Categories({ dict, locale, isRTL }: CategoriesProps) {
  const landingDict = dict.landing_v3 || {};
  const heroDict = landingDict.hero || {};

  const [ref, isIntersecting] = useIntersection({ threshold: 0.1, triggerOnce: true });

  const categories = isRTL
    ? [
        { icon: "💻", title: "أجهزة وإلكترونيات", desc: "أجهزة كمبيوتر، هواتف ذكية، وملحقات إلكترونية للمكاتب والمنازل." },
        { icon: "🏠", title: "أجهزة منزلية ومستلزمات", desc: "تجهيزات المطابخ، الأجهزة المعمرة، ومستلزمات المنزل الأساسية." },
        { icon: "🚗", title: "سيارات وأصول مرتفعة القيمة", desc: "مركبات، شاحنات، ومعدات النقل بأسعار الجملة." },
        { icon: "🪑", title: "فرش وتجهيز وتأثيث", desc: "أثاث مكتبي وفندقي ومنزلي، ومستلزمات الديكور والتجهيز." },
        { icon: "📦", title: "توريد وشراء متعدد البنود", desc: "طلبات الجملة والمشاريع الكبرى التي تتطلب بنود ومواصفات متعددة." },
        { icon: "🔧", title: "خدمات وتجهيزات خاصة", desc: "معدات متخصصة، تجهيزات تقنية، وحلول أعمال متكاملة." },
        { icon: "🏭", title: "معدات صناعية وآلات", desc: "خطوط إنتاج، آلات تصنيع، ومعدات المصانع والورش المتخصصة." },
        { icon: "🏢", title: "مواد بناء وتشطيبات", desc: "خامات البناء الأساسية، أدوات التشطيب، والتجهيزات المعمارية." },
      ]
    : [
        { icon: "💻", title: "Electronics & Devices", desc: "Computers, smartphones, and electronic accessories for home & office." },
        { icon: "🏠", title: "Home Appliances & Goods", desc: "Kitchen appliances, white goods, and essential home supplies." },
        { icon: "🚗", title: "Cars & High-Value Assets", desc: "Vehicles, trucks, and wholesale transportation equipment." },
        { icon: "🪑", title: "Furnishing & Setup", desc: "Office, hotel, and home furniture along with decor items." },
        { icon: "📦", title: "Multi-Item Procurement", desc: "Wholesale orders and major projects requiring multiple specifications." },
        { icon: "🔧", title: "Specialized Services", desc: "Specialized equipment, technical setups, and business solutions." },
        { icon: "🏭", title: "Industrial Machinery", desc: "Production lines, manufacturing machines, and workshop equipment." },
        { icon: "🏢", title: "Building Materials", desc: "Basic building raw materials, finishing tools, and architectural setups." },
      ];

  return (
    <section 
      id="categories" 
      className={styles.categoriesSection} 
      ref={ref as any}
    >
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.title}>
            {heroDict.supported_categories || "Sourcing Categories"}
          </h2>
          <p className={styles.subtitle}>
            {isRTL 
              ? "نغطي كافة احتياجاتك من المنتجات والأصول عبر شبكة واسعة من الموردين."
              : "We cover all your product and asset needs through a vast network of suppliers."}
          </p>
        </div>

        <div className={styles.categoriesGrid}>
          {categories.map((item, index) => (
            <div key={index} className={styles.categoryCard}>
              <span className={styles.cardIcon}>{item.icon}</span>
              <h4 className={styles.cardTitle}>{item.title}</h4>
              <p className={styles.cardDesc}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
