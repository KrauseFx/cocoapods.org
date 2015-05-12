require 'httparty'

CalculationStep = Struct.new(:description, :title, :score, :type) do
  def inspect
    "Description: #{description}, Score: #{score}, Type: #{type}"
  end

  def css_class
    case type
    when :base_score
      'base-score'
    when :modifier
      if score > 0
        'positive-score'
      else
        'negative-score'
      end
    end
  end

  def score_text
    return "#{score}" if score < 0 || type == :base_score

    "+ #{score}"
  end
end

class PodQualityEstimate
  include HTTParty
  base_uri 'https://cocoadocs-api-cocoapods-org.herokuapp.com'
  format :json
  attr_reader :calculation_steps

  def self.load_quality_estimate(pod_name)
    response = self.get("/pods/#{pod_name}/stats", headers: { 'Content-Type' => 'application/json; charset=UTF-8' })

    steps = []
    base = response.parsed_response['base']
    steps << CalculationStep.new(base['description'], nil, base['score'], :base_score)

    steps << response.parsed_response['metrics'].reject { |metric| !metric['applies_for_pod'] }.map do |metric|
      CalculationStep.new(metric['description'], metric['title'], metric['modifier'], :modifier)
    end

    self.new(pod_name, steps.flatten)
  end

  def initialize(pod_name, calculation_steps)
    @pod_name = pod_name
    @calculation_steps = calculation_steps
  end

  def total_score
    @calculation_steps.map(&:score).reduce(:+)
  end
end
