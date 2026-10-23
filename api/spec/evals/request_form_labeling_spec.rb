# frozen_string_literal: true

require 'rails_helper'
require Rails.root.join('evals/request_form/timed_task')

RSpec.describe 'request form labelling and timed task' do
  let(:dir) { Pathname(Dir.mktmpdir) }
  let(:requests) { RequestFormEval.requests }

  after { FileUtils.rm_rf(dir) }

  # An answer sheet giving the eval's own labels, with some changed.
  def write_sheet(path, changes = {})
    CSV.open(path, 'w') do |csv|
      csv << %w[request question_number question_id question choices answer note]
      requests.each do |number, kase|
        RequestFormEval.question_set(kase).items.reject(&:hidden).each do |item|
          answer = changes.fetch([ number, item.link_id ]) { RequestFormEval.reference_answer(kase, item.link_id) }
          csv << [ number, item.prefix, item.link_id, item.text, nil, answer.upcase, nil ]
        end
      end
    end
  end

  describe 'Cohen\'s kappa' do
    it 'matches a worked example' do
      # 50 items: 20 yes/yes, 15 no/no, 5 yes/no, 10 no/yes -> po 0.7, pe 0.5, kappa 0.4.
      a = %w[yes] * 25 + %w[no] * 25
      b = %w[yes] * 20 + %w[no] * 5 + %w[yes] * 10 + %w[no] * 15
      expect(RequestFormEval::Agreement.kappa(a, b)).to eq(0.4)
    end

    it 'scores a labeller who agrees with every label as 1, and lists each disagreement' do
      labels = dir.join('labels').tap(&:mkpath)
      write_sheet(labels.join('same.csv'))
      write_sheet(labels.join('other.csv'), { [ 'R01', 'program' ] => 'ask', [ 'R04', 'continuation' ] => 'initiation' })
      result = RequestFormEval::Agreement.new(dir: labels, out: StringIO.new).call

      same, other = result[:labellers].sort_by { |r| r[:labeller] }.reverse
      expect(same).to include(labeller: 'same', kappa: 1.0, agreement: 1.0)
      expect(other[:kappa]).to be < 1.0
      report = dir.join('AGREEMENT.md').read
      expect(report).to include('| R01 | tom-fep-saxenda | program | yes | ask | yes |', '| R04 | tom-older-prescription | continuation | ask | initiation | ask |')
    end

    it 'refuses a sheet with questions left out' do
      labels = dir.join('labels').tap(&:mkpath)
      CSV.open(labels.join('short.csv'), 'w') { |csv| csv << %w[request question_number question_id question choices answer note] }
      expect { RequestFormEval::Agreement.new(dir: labels, out: StringIO.new).call }.to raise_error(/no answer for/)
    end
  end

  describe 'timed task' do
    it "reports each person's time and error difference between the conditions" do
      dir.join('entries').mkpath
      CSV.open(dir.join('sessions.csv'), 'w') do |csv|
        csv << %w[participant position request condition admin_seconds question_seconds finished confidence hesitated_on]
        csv << [ 'A', 1, 'R01', 'chart_only', 240, 600, 'y', 4, nil ]
        csv << [ 'A', 2, 'R11', 'with_nora', 90, 200, 'y', 4, nil ]
      end
      # With Nora: everything as labelled. Chart only: one wrong field and a guess where the office should be asked.
      [ %w[R01 chart_only], %w[R11 with_nora] ].each do |number, condition|
        kase = requests.fetch(number)
        fields = RequestFormEval.spec['patients'].fetch(kase['patient']).merge(kase.fetch('fields', {}))
        CSV.open(dir.join('entries', "A-#{number}.csv"), 'w') do |csv|
          csv << %w[kind key label value]
          fields.each { |key, value| csv << [ 'field', key, nil, condition == 'chart_only' && key == 'rx_bin' ? '999999' : value ] }
          RequestFormEval.question_set(kase).items.reject(&:hidden).each do |item|
            csv << [ 'question', item.link_id, nil, RequestFormEval.reference_answer(kase, item.link_id) ]
          end
        end
      end
      jane = CSV.read(dir.join('entries', 'A-R11.csv'))
      jane.find { |row| row[1] == 'bmi' }[3] = '30-plus' # a guess: the chart cannot say
      CSV.open(dir.join('entries', 'A-R11.csv'), 'w') { |csv| jane.each { |row| csv << row } }

      person = RequestFormEval::TimedTask.new(dir: dir, out: StringIO.new).call[:people].first
      expect(person).to include(participant: 'A', seconds_saved: 550.0)
      expect(person[:errors]).to eq('chart_only' => 1, 'with_nora' => 1)
      expect(person[:guesses]).to eq('chart_only' => 0, 'with_nora' => 1)
      expect(dir.join('RESULTS.md').read).to include('| A | 840.0 | 290.0 | 550.0 |')
    end
  end
end
