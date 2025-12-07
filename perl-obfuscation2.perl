use POSIX qw(sin cos log exp abs);

# TUNED PARAMETER STRING: Simpler formula constants designed for smoother output.
# $k, $v, $l, $N (l is now the divisor for sine frequency)
$P = "0.5, 10, 10, 4:0.6, 9, 12, 5:0.7, 8, 14, 5:0.8, 7, 16, 5:0.9, 6, 18, 5:1.0, 5, 20, 4:1.1, 4, 22, 5:1.2, 3, 24, 11:1.3, 2, 26, 4:1.4, 1, 28, 9";
@W_PARAMS = map {[split(',', $_)]} split(':', $P);

sub W {
    my ($k, $v, $l, $N) = @_;
    join('', map {
        my $n = $_ + 1;
        # Core Formula: Smoother Logarithmic-Trig Generator
        my $val = ($k * log($n + $v)) / (sin($n / $l) + 1e-9);

        # Final Stabilization: Factor reduced to prevent overflow/chaos
        my $ascii_val = int(abs($val) * 10);
        
        # 1. Force Space Generation (Low chance, but ensures word breaks)
        if ($ascii_val % 30 < 2) {
            chr(32); # ASCII 32 (Space)
        } 
        # 2. Otherwise, generate a common lowercase Letter
        else {
            chr(($ascii_val % 26) + 97); # Range 97-122 (a-z)
        }
    } 0..$N-1);
}

# The final assembly loop
$output = "";
foreach my $p (@W_PARAMS) {
    # Generate the word using the 4 parameters from the list
    $output .= W(@{$p});
}

print $output;
