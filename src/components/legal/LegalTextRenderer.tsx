"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface LegalTextRendererProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  lastUpdated?: string;
  showImportantNotice?: boolean;
  importantNoticeText?: string;
}

/**
 * Componente para renderizar textos legales, artículos de blog y contenido similar
 * con estilos profesionales inspirados en documentos legales modernos.
 * 
 * Uso:
 * <LegalTextRenderer title="Términos y Condiciones" lastUpdated="1 de Enero, 2025">
 *   <LegalSection number="1" title="Aceptación de Términos">
 *     <LegalParagraph>Contenido del párrafo...</LegalParagraph>
 *   </LegalSection>
 * </LegalTextRenderer>
 */
export function LegalTextRenderer({
  children,
  className,
  title,
  lastUpdated,
  showImportantNotice = false,
  importantNoticeText,
}: LegalTextRendererProps) {
  return (
    <div className={cn("mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8", className)}>
      {title && (
        <div className="mb-8 border-b pb-6">
          <h1 className="mb-3 text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl">
            {title}
          </h1>
          {lastUpdated && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Última actualización: {lastUpdated}
            </p>
          )}
        </div>
      )}

      {showImportantNotice && (
        <div className="mb-8 rounded-lg border-2 border-amber-500 bg-amber-50 p-6 dark:bg-amber-950/20">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-400">
            Importante
          </p>
          <p className="mt-2 text-sm leading-relaxed text-gray-800 dark:text-gray-200">
            {importantNoticeText ||
              "LEA DETENIDAMENTE ESTOS TÉRMINOS ANTES DE UTILIZAR EL SERVICIO. AL ACCEDER O UTILIZAR EL SERVICIO, USTED ACEPTA QUEDAR VINCULADO POR ESTOS TÉRMINOS. SI NO ESTÁ DE ACUERDO, NO DEBE ACCEDER NI UTILIZAR EL SERVICIO."}
          </p>
        </div>
      )}

      <div className="prose prose-gray max-w-none dark:prose-invert prose-headings:font-bold prose-h2:mb-4 prose-h2:mt-8 prose-h2:text-2xl prose-h3:mb-3 prose-h3:mt-6 prose-h3:text-xl prose-p:mb-4 prose-p:leading-relaxed prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-strong:font-semibold prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6 prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-6 prose-li:mb-2">
        {children}
      </div>
    </div>
  );
}

interface LegalSectionProps {
  number?: string | number;
  title: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Componente para secciones numeradas dentro del documento legal
 */
export function LegalSection({
  number,
  title,
  children,
  className,
}: LegalSectionProps) {
  return (
    <section className={cn("mb-8", className)}>
      <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-gray-100">
        {number && <span className="mr-2">{number}.</span>}
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

interface LegalSubsectionProps {
  number?: string | number;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Componente para subsecciones dentro de una sección
 */
export function LegalSubsection({
  number,
  title,
  children,
  className,
}: LegalSubsectionProps) {
  return (
    <div className={cn("mb-6 ml-4", className)}>
      {title && (
        <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-100">
          {number && <span className="mr-2">{number}.</span>}
          {title}
        </h3>
      )}
      <div className="space-y-3">{children}</div>
    </div>
  );
}

interface LegalParagraphProps {
  children: React.ReactNode;
  className?: string;
  indent?: boolean;
}

/**
 * Componente para párrafos de texto legal
 */
export function LegalParagraph({
  children,
  className,
  indent = false,
}: LegalParagraphProps) {
  return (
    <p
      className={cn(
        "mb-4 leading-relaxed text-gray-700 dark:text-gray-300",
        indent && "ml-4",
        className
      )}
    >
      {children}
    </p>
  );
}

interface LegalListProps {
  items: React.ReactNode[];
  ordered?: boolean;
  className?: string;
}

/**
 * Componente para listas dentro del documento legal
 */
export function LegalList({ items, ordered = false, className }: LegalListProps) {
  const ListTag = ordered ? "ol" : "ul";
  const listClass = ordered ? "list-decimal" : "list-disc";

  return (
    <ListTag className={cn("my-4 space-y-2 pl-6", listClass, className)}>
      {items.map((item, index) => (
        <li key={index} className="leading-relaxed text-gray-700 dark:text-gray-300">
          {item}
        </li>
      ))}
    </ListTag>
  );
}

interface LegalHighlightProps {
  children: React.ReactNode;
  variant?: "warning" | "info" | "success";
  className?: string;
}

/**
 * Componente para resaltar información importante
 */
export function LegalHighlight({
  children,
  variant = "info",
  className,
}: LegalHighlightProps) {
  const variantStyles = {
    warning: "border-amber-500 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-100",
    info: "border-blue-500 bg-blue-50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-100",
    success: "border-green-500 bg-green-50 dark:bg-green-950/20 text-green-900 dark:text-green-100",
  };

  return (
    <div
      className={cn(
        "my-4 rounded-lg border-l-4 p-4",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </div>
  );
}

interface LegalDefinitionProps {
  term: string;
  definition: React.ReactNode;
  className?: string;
}

/**
 * Componente para definiciones de términos
 */
export function LegalDefinition({
  term,
  definition,
  className,
}: LegalDefinitionProps) {
  return (
    <div className={cn("mb-4", className)}>
      <dt className="mb-1 font-semibold text-gray-900 dark:text-gray-100">
        {term}
      </dt>
      <dd className="ml-4 text-gray-700 dark:text-gray-300">{definition}</dd>
    </div>
  );
}

interface LegalTableProps {
  headers: string[];
  rows: React.ReactNode[][];
  className?: string;
}

/**
 * Componente para tablas dentro del documento legal
 */
export function LegalTable({ headers, rows, className }: LegalTableProps) {
  return (
    <div className={cn("my-6 overflow-x-auto", className)}>
      <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            {headers.map((header, index) => (
              <th
                key={index}
                className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-gray-950">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
