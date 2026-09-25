// Real, filled-in sample output per format -- not a blank scaffold -- so
// the "Template preview" buttons read the same as a real generated
// document. Add the Agile Artifact sample text here once available.

export const STTM_SAMPLE_TEXT = `## 1. STTM Summary
Attribute|Detail
Report / Pipeline Name|VendorXYZ Overpayment Claims Ingestion and Mapping
Source File|Input_VendorXYZ_Overpayment_Claims_Sample.xlsx
Business Need|Ingest and map vendor overpayment claims data to enterprise canonical model for payment integrity reporting and analytics
Report Grain|Claim
Primary Data Domains|Claims, Payment Integrity
Source System|VendorXYZ Overpayment Claims Extract
Target|Enterprise Payment Integrity Claims Data Mart
Output Type|Source-to-Target Mapping Documentation
Ingestion Frequency|Monthly
Lookback / Retention|36 Months
Mapping Status|Candidate
Key Assumptions|Vendor file contains all required fields for overpayment claims; Member Unique ID maps to Member entity; Servicing Provider NPI maps to Provider entity; Audit Type and Overpayment Concept Name used for classification
Key Open Questions|Confirm exact target table and field names; Validate mapping of Subscriber ID and Dependent Number to canonical member attributes; Confirm handling of date/time format in Paid Date; Clarify if Total Correct Amount is stored or calculated
Grounding Sources|Input_VendorXYZ_Overpayment_Claims_Sample.xlsx, Payer_Data_Dictionary_Glossary_of_Terms.csv.xlsx, sample_adjudication_rules.docx
Version / Date|1.0 / 2026-06-30

## 2. STTM Mapping
Mapping ID|Report Section|Target Table / Output Object (Entity Name)|Target Field Name|Target Field Business Definition|Target Data Type|Target Format|Required Indicator|Source System|Source Domain|Source Entity / File|Source Field|Transformation Logic|Join Logic|Filter Logic|Aggregation Logic|Default Handling|Validation Rule|Privacy Classification|Mapping Confidence|Open Question|Notes
M-001|Overpayment Claims|Claim|Claim_Number|Unique claim identifier|VARCHAR|50|Y|VendorXYZ|Claims|Input_VendorXYZ_Overpayment_Claims_Sample.xlsx|Claim Number|Direct mapping|N/A|N/A|N/A|N/A|Non-Null|N|Confirmed|N/A|
M-002|Overpayment Claims|Claim|Source_Adjustment_Number|Vendor/source recovery or adjustment tracking reference|VARCHAR|50|Y|VendorXYZ|Claims|Input_VendorXYZ_Overpayment_Claims_Sample.xlsx|Source Adjustment Number|Direct mapping|N/A|N/A|N/A|N/A|Non-Null|N|Confirmed|N/A|
M-003|Overpayment Claims|Claim|Paid_Date|Date the original claim payment was issued|DATE|YYYY-MM-DD|Y|VendorXYZ|Claims|Input_VendorXYZ_Overpayment_Claims_Sample.xlsx|Paid Date|Extract date portion from datetime string|N/A|N/A|N/A|N/A|Date not in future|N|Candidate|Confirm date/time format handling|
M-004|Overpayment Claims|Claim|Total_Paid_Amount|Original amount paid for the claim|DECIMAL|Currency|Y|VendorXYZ|Claims|Input_VendorXYZ_Overpayment_Claims_Sample.xlsx|Total Paid Amount|Direct mapping|N/A|N/A|N/A|N/A|Positive value|N|Confirmed|N/A|
M-005|Overpayment Claims|Claim|Total_Allowed_Amount|Amount allowed based on plan/contract rules|DECIMAL|Currency|Y|VendorXYZ|Claims|Input_VendorXYZ_Overpayment_Claims_Sample.xlsx|Total Allowed Amount|Direct mapping|N/A|N/A|N/A|N/A|Positive value|N|Confirmed|N/A|
M-006|Overpayment Claims|Member|Subscriber_ID|Subscriber or policyholder identifier|VARCHAR|50|Y|VendorXYZ|Claims|Input_VendorXYZ_Overpayment_Claims_Sample.xlsx|Subscriber ID|Direct mapping|N/A|N/A|N/A|N/A|Non-Null|Y|Candidate|Confirm mapping to Member entity attribute|
M-007|Overpayment Claims|Member|Dependent_Number|Dependent sequence number|VARCHAR|2|Y|VendorXYZ|Claims|Input_VendorXYZ_Overpayment_Claims_Sample.xlsx|Dependent Number|Direct mapping|N/A|N/A|N/A|N/A|Non-Null|Y|Candidate|Confirm mapping to Member entity attribute|
M-008|Overpayment Claims|Member|Member_Unique_ID|Member-level identifier tied to claim|VARCHAR|50|Y|VendorXYZ|Claims|Input_VendorXYZ_Overpayment_Claims_Sample.xlsx|Member Unique ID|Direct mapping|N/A|N/A|N/A|N/A|Non-Null|Y|Confirmed|Maps to Member.Member_ID or Enterprise_Person_ID|
M-009|Overpayment Claims|Provider|Servicing_Provider_NPI|NPI of servicing provider|VARCHAR|10|Y|VendorXYZ|Claims|Input_VendorXYZ_Overpayment_Claims_Sample.xlsx|Servicing Provider NPI|Direct mapping|N/A|N/A|N/A|N/A|Valid NPI format|N|Confirmed|Maps to Provider.Provider_NPI|
M-010|Overpayment Claims|Provider|Servicing_Provider_Name|Name of servicing provider organization|VARCHAR|100|Y|VendorXYZ|Claims|Input_VendorXYZ_Overpayment_Claims_Sample.xlsx|Servicing Provider Name|Direct mapping|N/A|N/A|N/A|N/A|Non-Null|N|Confirmed|N/A|
M-011|Overpayment Claims|Claim|Total_Refund_Amount|Amount identified for recovery/refund due to overpayment|DECIMAL|Currency|Y|VendorXYZ|Claims|Input_VendorXYZ_Overpayment_Claims_Sample.xlsx|Total Refund Amount|Direct mapping|N/A|N/A|N/A|N/A|Positive or zero|N|Confirmed|N/A|
M-012|Overpayment Claims|Claim|Total_Correct_Amount|Corrected paid amount after refund adjustment|DECIMAL|Currency|Y|VendorXYZ|Claims|Input_VendorXYZ_Overpayment_Claims_Sample.xlsx|Total Correct Amount|Direct mapping|N/A|N/A|N/A|N/A|Positive or zero|N|Confirmed|N/A|
M-013|Overpayment Claims|Claim|Audit_Type|Audit category classifying overpayment finding|VARCHAR|50|Y|VendorXYZ|Claims|Input_VendorXYZ_Overpayment_Claims_Sample.xlsx|Audit Type|Direct mapping|N/A|N/A|N/A|N/A|Non-Null|N|Confirmed|N/A|
M-014|Overpayment Claims|Claim|Overpayment_Concept_Name|Overpayment reason or concept for reporting and routing|VARCHAR|100|Y|VendorXYZ|Claims|Input_VendorXYZ_Overpayment_Claims_Sample.xlsx|Overpayment Concept Name|Direct mapping|N/A|N/A|N/A|N/A|Non-Null|N|Confirmed|N/A|

## 3. Assumptions and Open Q
Type|ID|Statement|Basis / Note
Assumption|A-001|Member Unique ID from vendor file maps to Member.Member_ID or Enterprise_Person_ID in canonical model|Based on Payer_Data_Dictionary_Glossary_of_Terms.csv.xlsx member entity definitions
Assumption|A-002|Subscriber ID and Dependent Number map to Member attributes for subscriber and dependent identification|Vendor file includes these fields; canonical model has Subscriber_ID and Dependent_Number attributes
Open Question|Q-001|Confirm exact target table and field names for overpayment claims data|Vendor file uses generic claim and member fields; canonical model specifics needed
Open Question|Q-002|Confirm handling of Paid Date datetime format and time zone considerations|Vendor file includes datetime; target expects DATE only per canonical model
Open Question|Q-003|Clarify if Total Correct Amount is stored as-is or calculated during processing|Vendor file provides value; business rules may adjust
Open Question|Q-004|Validate mapping of Subscriber ID and Dependent Number to canonical member attributes|Requires SME confirmation
Open Question|Q-005|Confirm if Servicing Provider Name is required in target or only NPI is authoritative|Vendor file includes both; canonical model may prioritize NPI

## 4. SME Review Checklist
Review Area|Review Question|Status
Source Document Metadata|Are all source fields correctly identified and extracted?|Pending
Canonical Mapping|Are all source fields mapped to correct canonical attributes?|Pending SME validation for Subscriber ID and Dependent Number
Transformation Logic|Is the transformation logic for Paid Date and other fields accurate?|Pending SME review
Validation Rules|Are validation rules complete and aligned with business rules?|Pending
Privacy Classification|Is PHI/PII classification correctly assigned?|Confirmed per source data dictionary
Mapping Confidence|Are confidence levels appropriate for each mapping?|Candidate for fields with open questions; Confirmed otherwise`;

export const FRD_SAMPLE_TEXT = `Functional Requirements Document (FRD)

Project: test

Date: 2026-06-30

--------------------------------------------------------------------------------

1. Introduction

This document specifies the functional requirements for processing and reporting on vendor overpayment claims data received from VendorXYZ. The source data consists of overpayment claims extracts containing claim identifiers, payment and allowed amounts, member and provider identifiers, audit classifications, and overpayment concepts. The purpose is to enable accurate ingestion, validation, mapping, and reporting of overpayment claims to support payment integrity activities including audit, recovery, and compliance monitoring. The requirements herein are based on the provided VendorXYZ Overpayment Claims Sample dataset and aligned with healthcare payer data standards and payment integrity adjudication rules.

--------------------------------------------------------------------------------

2. Stakeholders

- Data Onboarding Analyst: Responsible for vendor data ingestion and mapping validation.
- Payment Integrity Analyst: Uses overpayment claims data for audit and recovery analysis.
- Reporting Analyst: Develops reports and dashboards based on overpayment claims data.
- Data Engineer: Implements ETL pipelines and data transformations per specifications.
- Compliance Officer: Reviews overpayment reporting for regulatory adherence.
- Product Owner: Oversees feature delivery and prioritization.
- SME (Subject Matter Expert): Provides domain knowledge and clarifications on mappings and business rules.

--------------------------------------------------------------------------------

3. Functional Requirements

FR-001: Source Data Ingestion

The system shall ingest VendorXYZ overpayment claims data from provided Excel files containing the fields: Claim Number, Source Adjustment Number, Paid Date, Total Paid Amount, Total Allowed Amount, Subscriber ID, Dependent Number, Member Unique ID, Servicing Provider NPI, Servicing Provider Name, Total Refund Amount, Total Correct Amount, Audit Type, and Overpayment Concept Name.

FR-002: Data Validation

The system shall validate the following for each ingested record:

a) Claim Number and Source Adjustment Number must be non-null and unique per record.
b) Paid Date must be a valid date and not in the future relative to ingestion date.
c) Total Paid Amount, Total Allowed Amount, Total Refund Amount, and Total Correct Amount must be positive decimal values.
d) Subscriber ID, Dependent Number, Member Unique ID, Servicing Provider NPI, and Servicing Provider Name must be non-null.
e) Audit Type and Overpayment Concept Name must be non-null and conform to known audit categories and overpayment concepts.

FR-003: Member and Provider Mapping

The system shall map Subscriber ID, Dependent Number, and Member Unique ID to the enterprise Member entity using the canonical model attributes Member_ID and Subscriber_ID.

The system shall map Servicing Provider NPI and Servicing Provider Name to the enterprise Provider entity using the canonical Provider NPI attribute.

FR-004: Overpayment Claim Record Creation

The system shall create an Overpayment Claim record in the target data store with the following mapped attributes:

- Claim Number (business key)
- Source Adjustment Number
- Paid Date
- Total Paid Amount
- Total Allowed Amount
- Subscriber ID
- Dependent Number
- Member Unique ID
- Servicing Provider NPI
- Servicing Provider Name
- Total Refund Amount
- Total Correct Amount
- Audit Type
- Overpayment Concept Name

FR-005: Reporting Support

The system shall support generation of reports and dashboards at claim-level granularity including metrics such as:

- Total number of overpayment claims
- Aggregate Total Paid Amount, Total Allowed Amount, Total Refund Amount, and Total Correct Amount
- Overpayment counts and amounts by Audit Type and Overpayment Concept Name
- Overpayment counts and amounts by Servicing Provider NPI and Name
- Overpayment counts and amounts by Subscriber ID and Member Unique ID

FR-006: Data Lineage and Auditability

The system shall capture and store the source file name, ingestion timestamp, and record load status for each overpayment claim record to support audit and traceability.

FR-007: Error Handling and Notification

The system shall flag records failing validation rules and generate error reports for review by Data Onboarding Analysts. Records with critical errors shall be quarantined and not loaded into the target system until corrected.

FR-008: Data Privacy and Security

The system shall classify and protect PHI/PII fields such as Subscriber ID, Member Unique ID, and Provider NPI in accordance with organizational data privacy policies and regulatory requirements.

--------------------------------------------------------------------------------

4. Assumptions & Constraints

- The VendorXYZ overpayment claims extract file format and field definitions remain consistent as per the provided sample.
- The enterprise canonical data model for Member and Provider entities is available and maintained.
- Audit Type and Overpayment Concept Name values are standardized and documented in a reference glossary.
- Data ingestion frequency and scheduling are defined outside the scope of this document.
- No automated adjudication or payment adjustment is performed by this process; data is for reporting and manual review.

--------------------------------------------------------------------------------

5. Open Questions

- OQ-001: Are there any additional fields or metadata from VendorXYZ files required for processing beyond those provided?
- OQ-002: What is the expected frequency and timing for VendorXYZ overpayment claims file delivery?
- OQ-003: Should the system support historical data reloads and incremental updates, and if so, what are the key indicators?
- OQ-004: Are there specific business rules or thresholds for flagging overpayment claims beyond the provided audit types and concepts?
- OQ-005: What are the roles and responsibilities for reviewing and resolving flagged data errors during ingestion?

--------------------------------------------------------------------------------

End of Document`;

// Built from the reference Feature Template.docx (6DocsfromAISearch /
// Docs) content -- same section shape the backend's knowledge base uses
// for Agile Artifact generation: Feature Description, Business Objective,
// Key Capabilities (KC-N), Out of Scope, Assumptions, Dependencies,
// Acceptance Criteria (AC-N), a Gherkin scenario block, a Risks table,
// and Feature Outcome.
export const AGILE_SAMPLE_TEXT = `Feature: Automated Canonical Data Mapping and STTM Generation for Vendor Data Onboarding

--------------------------------------------------------------------------------

1. Feature Description

As a Data Onboarding Analyst, I want the system to automatically analyze vendor source documentation, map source attributes to the enterprise canonical model, and generate Source-to-Target Mapping (STTM) documentation for Databricks Bronze, Silver, and Gold layers, so that I can significantly reduce manual analysis effort, accelerate vendor onboarding, and produce consistent implementation-ready deliverables.

--------------------------------------------------------------------------------

2. Business Objective

Enable rapid onboarding of new vendor data sources by automating metadata analysis, canonical mapping, transformation specification, and STTM generation. This feature aims to:

- Reduce manual mapping efforts.
- Improve onboarding consistency.
- Accelerate project initiation.
- Increase mapping accuracy.
- Provide implementation-ready documentation for Data Engineering teams.

--------------------------------------------------------------------------------

3. Key Capabilities

KC-1: Source Document Ingestion
Accept and process vendor documentation in multiple formats.

KC-2: Metadata Discovery
Extract entities, attributes, relationships, data types, and business definitions.

KC-3: Canonical Model Mapping
Map source attributes to approved enterprise canonical entities and attributes.

KC-4: Mapping Confidence Assessment
Assign confidence scores to suggested mappings.

KC-5: Gap and Exception Analysis
Identify unmapped fields, missing definitions, and required SME decisions.

KC-6: Bronze Layer STTM Generation
Generate raw ingestion mappings from source systems to Bronze layer.

KC-7: Silver Layer STTM Generation
Generate cleansing, standardization, and enrichment mappings.

KC-8: Gold Layer STTM Generation
Generate business-ready mappings for reporting and analytics consumption.

KC-9: Assumption and Question Management
Generate assumptions, clarifications, and unresolved issues requiring review.

KC-10: Export Capability
Export STTM output into approved Excel templates.

--------------------------------------------------------------------------------

4. Out of Scope

- Databricks notebook generation
- ETL code generation
- Automated deployment
- Production data ingestion execution
- Canonical model modifications
- Schema management
- Automated approval workflows
- Direct integration with source systems

--------------------------------------------------------------------------------

5. Assumptions

- Enterprise canonical model is available and maintained.
- Databricks Bronze/Silver/Gold architecture has been defined.
- Vendor metadata and source documentation are provided.
- Users have access to approved STTM templates.
- SME review is required for low-confidence mappings.
- Reference business glossary is available.

--------------------------------------------------------------------------------

6. Dependencies

- Enterprise Canonical Data Model
- Business Glossary
- Data Dictionary
- Data Governance Standards
- Copilot Studio Agent
- AI Mapping Engine
- Databricks Data Standards
- STTM Template Repository
- Vendor Source Documentation

--------------------------------------------------------------------------------

7. Acceptance Criteria (System Must)

AC-1: Source Document Intake
System must accept source documentation in supported formats including Excel, CSV, JSON, XML, Word, and PDF files.

AC-2: Metadata Extraction
System must identify source entities, attributes, data types, and descriptions from uploaded documentation.

AC-3: Canonical Attribute Mapping
System must map source fields to corresponding canonical entities and attributes using available business definitions and mapping rules.

AC-4: Confidence Scoring
System must assign confidence scores to all generated mappings.

AC-5: Gap Identification
System must identify unmapped attributes, missing definitions, and ambiguous mappings.

AC-6: Bronze Mapping Generation
System must generate source-to-Bronze mappings including source metadata and ingestion specifications.

AC-7: Silver Mapping Generation
System must generate Silver layer mappings including cleansing, standardization, and transformation requirements.

AC-8: Gold Mapping Generation
System must generate Gold layer mappings supporting business reporting and analytics requirements.

AC-9: Assumption Generation
System must generate assumptions, questions, and issues requiring SME clarification.

AC-10: Export Output
System must generate and export completed STTM documentation using approved templates.

--------------------------------------------------------------------------------

8. Gherkin Acceptance Criteria

Scenario: Upload Vendor Metadata
Given a user has vendor metadata documentation
When the user uploads the documentation
Then the system shall validate the file format
And extract metadata from the source documents
And initiate the mapping process

--------------------------------------------------------------------------------

9. Risks and Open Questions

| ID | Risk / Question |
|----|------------------|
| R1 | Vendor documentation may be incomplete or inconsistent. |
| R2 | Canonical model may not contain corresponding attributes for all vendor fields. |
| R3 | Mapping confidence may require SME validation for complex healthcare concepts. |
| R4 | Business definitions may vary across tenants or vendors. |
| R5 | Source metadata may contain non-standard naming conventions. |
| R6 | Additional transformation rules may be required outside standard onboarding patterns. |

--------------------------------------------------------------------------------

10. Feature Outcome

Upon completion, business users can upload vendor data documentation and automatically receive:

- Canonical Mapping Recommendations
- Bronze/Silver/Gold STTM Documentation
- Assumptions and Questions Log
- Mapping Confidence Assessment
- Implementation-Ready Specifications for Data Engineering Teams
- Significant reduction in manual onboarding effort and delivery timelines.

--------------------------------------------------------------------------------

End of Document`;

export const TEMPLATE_PREVIEW_META = {
  sttm: { label: 'STTM Template', text: STTM_SAMPLE_TEXT, kind: 'sttm' },
  frd: { label: 'FRD Template', text: FRD_SAMPLE_TEXT, kind: 'doc' },
  gherkin: { label: 'Agile Artifact Template', text: AGILE_SAMPLE_TEXT, kind: 'doc' },
};
