# frozen_string_literal: true

require 'rails_helper'
require Rails.root.join('evals/evidence/harness')

# Guards the evidence eval itself: the cases stay consistent with the policy
# library, and the grader scores known answers the way it must. The eval's
# numbers are produced by `bin/rails eval:evidence`, not here.
RSpec.describe EvidenceEval do
  let(:cases) { EvidenceEval::Case.load_all }

  before { silence_seed_output { load Rails.root.join('db/seeds/policy_library.rb') } }

  it 'loads every case, with every labelled quote present in its chart' do
    expect(cases.size).to be >= 15
    expect(cases.map(&:id).uniq.size).to eq(cases.size)
  end

  it 'labels exactly the criteria each policy has' do
    expect { EvidenceEval::Library.check_labels_cover_criteria!(cases) }.not_to raise_error
  end

  it 'matches the policy library the labels were written against' do
    pinned = JSON.parse(EvidenceEval::STATE_PATH.read).fetch('criteria_digest')
    expect(EvidenceEval::Library.digest(cases)).to eq(pinned),
                                                   'The policy library changed. Re-read the labels in evals/evidence/cases, then update criteria_digest in state.json.'
  end

  it 'keeps the train and test slices disjoint and complete' do
    state = JSON.parse(EvidenceEval::STATE_PATH.read)
    expect(state['train_ids'] & state['test_ids']).to be_empty
    expect((state['train_ids'] + state['test_ids']).sort).to eq(cases.map(&:id).sort)
  end

  it 'covers both directions' do
    expect(cases.sum { |c| c.positions('supported').size }).to be > 20
    expect(cases.sum { |c| c.positions('unsupported').size }).to be > 20
  end

  describe EvidenceEval::Grader do
    def mean(metric, system)
      values = cases.filter_map { |c| described_class.call(c, EvidenceEval::SelfCheck.public_send(system, c))[:grade][metric] }
      values.sum / values.size
    end

    it 'scores a perfect answer 1.0 on every metric' do
      expect(%w[found clean precision].map { |m| mean(m, :oracle) }).to all(eq(1.0))
    end

    it 'does not reward proposing nothing' do
      expect(mean('found', :null)).to eq(0.0)
      expect(mean('clean', :null)).to eq(1.0)
    end

    it 'does not reward proposing everything' do
      expect(mean('found', :everything)).to eq(1.0)
      expect(mean('clean', :everything)).to eq(0.0)
      expect(mean('precision', :everything)).to be < 0.5
    end

    it 'counts an excerpt on an unsupported requirement as a false proposal, trap or not' do
      eval_case = cases.find { |c| c.id == 'fill_only_pharmacy_record' }
      trap_span = eval_case.spans(5, 'traps').first
      elsewhere = EvidenceEval::Span.new(0, 0, 10)
      proposals = [ trap_span, elsewhere ].map { |span| EvidenceEval::SelfCheck.proposal(eval_case, 5, span, 'test') }

      graded = described_class.call(eval_case, proposals)

      expect(graded[:requirements].find { |r| r[:position] == 5 }[:proposals].map { |p| p[:verdict] }).to eq(%w[trap false])
      expect(graded[:counts]['false_proposals']).to eq(2)
      expect(graded[:grade]['clean']).to eq(0.5)
    end

    it 'leaves not applicable requirements out of the score' do
      eval_case = cases.find { |c| c.id == 'pass_basic' }
      proposals = [ 3 ].map { |position| EvidenceEval::SelfCheck.proposal(eval_case, position, EvidenceEval::Span.new(0, 0, 10), 'test') }

      graded = described_class.call(eval_case, proposals)

      expect(graded[:counts]).to include('excluded' => 1, 'proposals' => 0, 'false_proposals' => 0)
      expect(graded[:grade]['clean']).to be_nil
    end
  end

  describe EvidenceEval::Case do
    it 'refuses a label whose quote is not in the chart' do
      Tempfile.create([ 'case', '.yml' ]) do |file|
        file.write(cases.first.path.read.sub('BMI 36.3"]', 'BMI 99.9"]'))
        file.flush
        expect { described_class.new(Pathname.new(file.path)) }.to raise_error(EvidenceEval::HarnessError, /quote not found/)
      end
    end
  end
end
