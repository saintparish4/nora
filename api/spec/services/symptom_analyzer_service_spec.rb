require 'rails_helper'

RSpec.describe Triage::SymptomAnalyzerService do
  let(:service) { described_class.new(description) }
  
  describe '#analyze' do
    context 'with chest pain symptoms' do
      let(:description) { 'I have chest pain and shortness of breath' }
      
      it 'recommends emergency care' do
        VCR.use_cassette('chest_pain_emergency') do
          result = service.analyze
          expect(result[:urgency]).to eq('emergency')
        end
      end
    end
    
    context 'with acne symptoms' do
      let(:description) { 'I have acne on my face' }
      
      it 'recommends dermatology' do
        VCR.use_cassette('acne_dermatology') do
          result = service.analyze
          expect(result[:specialty]).to eq('dermatology')
          expect(result[:urgency]).to eq('routine')
        end
      end
    end
    
    context 'with caching' do
      let(:description) { 'sore throat and fever' }
      
      it 'caches results' do
        allow(Rails.cache).to receive(:read).and_return(nil)
        allow(Rails.cache).to receive(:write)
        
        service.analyze
        
        expect(Rails.cache).to have_received(:write)
      end
    end
  end
end