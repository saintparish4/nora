require "prawn"

# Text is transcoded to Windows-1252 before it reaches Prawn (see #safe), so
# the built-in fonts are enough and the warning about them is noise.
Prawn::Fonts::AFM.hide_m17n_warning = true

module Authorizations
  # Renders an approved prior authorization as a PDF packet: cover sheet,
  # requirement checklist, cited excerpts, and the list of source documents.
  class PacketService
    def self.call(...) = new(...).call

    def initialize(prior_authorization)
      @pa = prior_authorization
    end

    def call
      raise Error, "Only an approved packet can be downloaded." unless packet_available?

      approval = @pa.latest_approval
      patient = @pa.patient
      coverage = @pa.patient_coverage
      requirements = @pa.requirements.includes(:policy_criterion, evidence: :chart_document).to_a

      pdf = Prawn::Document.new(page_size: "LETTER", margin: 54, info: { Title: "Prior authorization packet", Creator: "Nora" })
      pdf.font_size 10

      write pdf, "Prior authorization request", size: 18, style: :bold
      write pdf, @pa.item_name + (@pa.item_code.present? ? " (#{@pa.item_code})" : ""), size: 13
      pdf.move_down 12

      field(pdf, "Patient", "#{patient.full_name}, DOB #{patient.date_of_birth&.strftime('%m/%d/%Y')}#{patient.mrn.present? ? ", MRN #{patient.mrn}" : ''}")
      field(pdf, "Payer", "#{coverage.insurance_plan.payer.name}, #{coverage.insurance_plan.name}")
      field(pdf, "Member ID", [ coverage.member_id, coverage.group_number.presence && "group #{coverage.group_number}" ].compact.join(", "))
      field(pdf, "Requesting clinician", @pa.requested_by.full_name)
      field(pdf, "Practice", @pa.organization.name + (@pa.organization.npi.present? ? ", NPI #{@pa.organization.npi}" : ""))
      field(pdf, "Policy", "#{@pa.policy_template.title}#{@pa.policy_template.generic? ? ' (generic criteria)' : ''}")
      field(pdf, "Approved by", "#{approval.approved_by.full_name} on #{approval.created_at.in_time_zone(@pa.organization.timezone).strftime('%m/%d/%Y %H:%M %Z')}")
      pdf.move_down 16

      write pdf, "Criteria and supporting documentation", size: 13, style: :bold
      pdf.move_down 6
      requirements.each_with_index do |req, i|
        mark = req.status == "met" ? "Met" : "Not applicable"
        write pdf, "#{i + 1}. #{req.policy_criterion.text}", style: :bold
        write pdf, mark, color: "555555"
        write pdf, "Note: #{req.note}", color: "555555" if req.note.present?
        req.verified_evidence.each do |ev|
          pdf.indent(14) do
            write pdf, "“#{ev.excerpt}”"
            write pdf, "#{ev.chart_document.title}#{ev.chart_document.occurred_on ? ", #{ev.chart_document.occurred_on.strftime('%m/%d/%Y')}" : ''}", color: "555555", size: 9
          end
          pdf.move_down 4
        end
        pdf.move_down 8
      end

      cited = requirements.flat_map(&:verified_evidence).map(&:chart_document).uniq.sort_by { |d| [ d.occurred_on || Date.new(1900), d.id ] }
      write pdf, "Source documents", size: 13, style: :bold
      pdf.move_down 4
      cited.each do |doc|
        write pdf, "#{doc.title} (#{doc.kind.humanize(capitalize: false)}#{doc.occurred_on ? ", #{doc.occurred_on.strftime('%m/%d/%Y')}" : ''})"
      end

      pdf.number_pages "Page <page> of <total>", at: [ pdf.bounds.right - 100, -10 ], width: 100, align: :right, size: 8
      pdf.render
    end

    private

    def packet_available?
      %w[approved submitted payer_pending approved_by_payer denied appealed closed].include?(@pa.status) &&
        @pa.latest_approval.present? &&
        (@pa.status != "approved" || @pa.approval_current?)
    end

    def field(pdf, label, value)
      pdf.formatted_text [ { text: "#{label}: ", styles: [ :bold ] }, { text: safe(value) } ]
    end

    def write(pdf, value, **options)
      pdf.text safe(value), **options
    end

    # Prawn's built-in fonts cover Windows-1252 only. Chart text can hold
    # anything, so characters outside it become "?" rather than failing the
    # whole packet.
    def safe(value)
      value.to_s.encode("Windows-1252", invalid: :replace, undef: :replace, replace: "?").encode("UTF-8")
    end
  end
end
