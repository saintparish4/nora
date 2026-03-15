namespace :symptoms do
    desc "Test symptom analyzer with common scenarios"
    task test: :environment do
      scenarios = [
        "chest pain and difficulty breathing",
        "mild acne on forehead",
        "sore throat for 2 days",
        "annual physical checkup needed",
        "ankle sprain from running",
        "feeling anxious and depressed",
        "need help with diet and weight loss"
      ]

      scenarios.each do |symptom|
        puts "\n#{'-' * 50}"
        puts "Testing: #{symptom}"
        puts "-" * 50

        analyzer = SymptomAnalyzerService.new(symptom)
        result = analyzer.analyze

        puts "Specialty: #{result[:specialty_name]}"
        puts "Urgency: #{result[:urgency]}"
        puts "Reasoning: #{result[:reasoning]}"
        puts "Keywords: #{result[:keywords].join(', ')}"
      end
    end
  end
