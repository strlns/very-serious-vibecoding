#!/usr/bin/env perl
use strict;
use warnings;
use utf8;
use Time::HiRes qw(time sleep);
use POSIX qw(:termios_h);

# Keine CPAN-Module nötig. Start: perl diamant.pl; Ende: Q, Esc oder Ctrl-C.
die "Bitte in einem interaktiven ANSI-Terminal starten.\n" unless -t STDIN && -t STDOUT;
binmode STDOUT, ':encoding(UTF-8)';

my ($stop, $resize) = (0, 1);
my ($cols, $rows) = (80, 24);
my $zoom = 1;
my $rotation = 0;
my $automatic = 1;
my $tilt_time = 0;
my $angular_speed = 0;
my $last_control = time;
my $zoom_speed = 0;
my ($position_x, $position_y) = (0.5, 0.5);
my %held;
my %controls = (
    w => ['zoom', 1], s => ['zoom', -1],
    '+' => ['zoom', 1], '-' => ['zoom', -1],
    a => ['turn', -1], d => ['turn', 1],
    up => ['move_y', -1], down => ['move_y', 1],
    left => ['move_x', -1], right => ['move_x', 1],
);

# Ohne Key-up-Ereignisse wird Loslassen aus ausbleibenden Wiederholungen
# abgeleitet. Die erste Frist überbrückt die übliche OS-Wiederholverzögerung.
sub hold_control {
    my ($axis, $direction, $now) = @_;
    my $state = $held{$axis};
    if ($state && $state->{direction} == $direction && $now <= $state->{until}) {
        $state->{until} = $now + 0.12;
    } else {
        $held{$axis} = { direction => $direction, start => $now,
                         until => $now + 0.5 };
    }
}

sub control_target {
    my ($axis, $now) = @_;
    my $state = $held{$axis};
    return 0 unless $state && $now <= $state->{until};
    my $duration = $now - $state->{start};
    my $stage = $duration >= 1.6 ? 3 : $duration >= 0.8 ? 2 : 1;
    return $state->{direction} * $stage;
}
my $input = '';
my $escape_since;

# Escape-Sequenzen können sich auf mehrere Lesevorgänge verteilen.
# CSI (ESC [) und SS3 (ESC O) decken die üblichen Pfeiltastenmodi ab.
sub read_keys {
    my $bytes = '';
    my $read = sysread(STDIN, $bytes, 4096);
    $input .= $bytes if defined($read) && $read > 0;
    my @keys;
    while (length $input) {
        if (substr($input, 0, 1) ne "\e") {
            push @keys, substr($input, 0, 1, '');
            undef $escape_since;
            next;
        }
        $escape_since //= time;
        if ($input =~ s/^\e(?:\[[0-?]*[ -\/]*|O)([\x40-\x7e])//) {
            my %arrows = (A => 'up', B => 'down', C => 'right', D => 'left');
            push @keys, $arrows{$1} if exists $arrows{$1};
            undef $escape_since;
            next;
        }
        if ($input eq "\e") {
            last if time - $escape_since < 0.15;
            substr($input, 0, 1, '');
            push @keys, "\e";
        } elsif ($input =~ /^\e(?:\[[0-?]*[ -\/]*|O)$/) {
            last if time - $escape_since < 0.5;
            $input = ''; # Unvollständige Sequenz verwerfen.
        } else {
            substr($input, 0, 2, ''); # Andere Alt-/Escape-Tasten ignorieren.
        }
        undef $escape_since;
    }
    # Alte Wiederholungen verwerfen statt über viele Bilder nachzuspielen.
    return ('q') if grep { $_ eq 'q' || $_ eq 'Q' || $_ eq "\e" } @keys;
    splice @keys, 0, @keys-3 if @keys > 3;
    return @keys;
}
my $saved = POSIX::Termios->new;
$saved->getattr(0);
my $raw = POSIX::Termios->new;
$raw->getattr(0);
$raw->setlflag($raw->getlflag & ~(ICANON | ECHO));
$raw->setcc(VMIN, 0);
$raw->setcc(VTIME, 0);
my $active = 0;
$| = 1;
END {
    if ($active) {
        $saved->setattr(0, TCSANOW);
        print "\e[0m\e[?25h\e[?1049l";
    }
}
$SIG{INT} = $SIG{TERM} = $SIG{HUP} = sub { $stop = 1 };
$SIG{WINCH} = sub { $resize = 1 };
$active = 1;
$raw->setattr(0, TCSANOW);
print "\e[?1049h\e[?25l\e[2J";

sub terminal_size {
    # stty fragt die tatsächliche TTY-Größe ab, auch nach Fensteränderungen.
    my $size = `stty size 2>/dev/null`;
    if ($size =~ /^\s*(\d+)\s+(\d+)/ && $1 > 0 && $2 > 0) {
        ($rows, $cols) = ($1, $2);
    } else {
        $rows = $ENV{LINES}   if ($ENV{LINES}   // '') =~ /^[1-9]\d*$/;
        $cols = $ENV{COLUMNS} if ($ENV{COLUMNS} // '') =~ /^[1-9]\d*$/;
    }
}

# Ein geschliffener Diamant: Spitze, breiter Gürtel und kleine obere Tafel.
my @vertices = ([0, -1.5, 0]);
my $pi = 4 * atan2(1, 1);
for my $ring ([1, 0.20], [0.48, 0.85]) {
    for my $i (0 .. 7) {
        my $a = $i * $pi / 4;
        push @vertices, [$ring->[0] * cos($a), $ring->[1], $ring->[0] * sin($a)];
    }
}
my @faces;
my @edges;
for my $i (0 .. 7) {
    my $j = ($i + 1) % 8;
    push @faces, [0, 1+$i, 1+$j],
        [1+$i, 9+$i, 9+$j], [1+$i, 9+$j, 1+$j];
    push @edges, [0, 1+$i], [1+$i, 1+$j],
        [1+$i, 9+$i], [1+$i, 9+$j], [9+$i, 9+$j];
}
push @faces, [9, 9+$_, 10+$_] for 1 .. 6;

my $previous = time;
while (!$stop) {
    my $frame_start = time;
    my $dt = $frame_start - $previous;
    $previous = $frame_start;
    $dt = 0.1 if $dt > 0.1;
    if ($resize) { terminal_size(); $resize = 0; print "\e[2J" }
    my ($step_x, $step_y) = (0, 0);
    for my $key (read_keys()) {
        if ($key eq 'q' || $key eq 'Q' || $key eq "\e") { $stop = 1; last }
        if (my $control = $controls{lc $key}) {
            $automatic = 0;
            $last_control = $frame_start;
            # Beim Wechsel zur Drehung auch einen alten Zoom-Nachlauf stoppen.
            if ($control->[0] ne 'zoom') {
                delete $held{zoom};
                $zoom_speed = 0;
            }
            if ($control->[0] =~ /^move_/) {
                # Ein Richtungswechsel beendet die vorige Pfeilbewegung.
                delete $held{ $control->[0] eq 'move_x' ? 'move_y' : 'move_x' };
            } else {
                delete @held{qw(move_x move_y)};
            }
            hold_control(@$control, $frame_start);
            $step_x += $control->[1] if $control->[0] eq 'move_x';
            $step_y += $control->[1] if $control->[0] eq 'move_y';
        }
    }
    last if $stop;
    my $turn = control_target('turn', $frame_start);
    my $zoom_target = control_target('zoom', $frame_start);
    # Zeitbasierte Beschleunigung und Reibung statt Winkelsprüngen pro Taste.
    $automatic = 1 if $frame_start-$last_control > 1.8;
    my $target_speed = $automatic ? 0.72 : $turn*0.72;
    my $response = $automatic ? 0.9 : $turn ? 7 : 6.5;
    $angular_speed += ($target_speed-$angular_speed)*(1-exp(-$response*$dt));
    $angular_speed = 0 if !$automatic && !$turn && abs($angular_speed)<0.003;
    $rotation += $angular_speed*$dt;
    $tilt_time += $dt * ($angular_speed/0.72) if $automatic;
    # Zoom bleibt auf einer festen Geschwindigkeit, auch bei langem Halten.
    $zoom_target = $zoom_target <=> 0;
    $zoom_speed += ($zoom_target * 0.9 - $zoom_speed) * (1 - exp(-12*$dt));
    $zoom_speed = 0 if !$zoom_target && abs($zoom_speed) < 0.003;
    $zoom *= exp($zoom_speed * $dt);
    $zoom = 0.2 if $zoom < 0.2;
    $zoom = 4 if $zoom > 4;
    my $height = $rows > 2 ? $rows - 2 : 1;
    my $width = $cols > 1 ? $cols - 1 : 1; # Kein automatischer Zeilenumbruch.
    # Alle Punkte liegen in einer Kugel mit Radius 1.5. Deren perspektivisch
    # projizierter Radius ist r / sqrt(1 - (r/4)^2). So passt auch die untere
    # Spitze bei jeder Rotation ins Bild, mit einem Rand von einer Zelle.
    my $radius = 1.5 / sqrt(1 - (1.5/4)**2);
    my $usable_h = $height > 2 ? $height - 2 : $height;
    my $usable_w = $width > 2 ? $width - 2 : $width;
    my $scale = $usable_h / (2*$radius);
    $scale = $usable_w / (4*$radius) if $scale > $usable_w / (4*$radius);
    $scale *= $zoom;
    my ($ay, $ax) = ($rotation, 0.30 + sin($tilt_time * 0.45) * 0.38);
    my @points;
    for my $v (@vertices) {
        my ($x, $y, $z) = @$v;
        ($x, $z) = ($x*cos($ay)+$z*sin($ay), -$x*sin($ay)+$z*cos($ay));
        ($y, $z) = ($y*cos($ax)-$z*sin($ax), $y*sin($ax)+$z*cos($ax));
        my $p = 4 / (4 + $z);
        push @points, [$width/2 + $x*$scale*2*$p,
                       $height/2 - $y*$scale*$p, $z, $x, $y];
    }
    # Die asymmetrische Form anhand ihrer projizierten Silhouette zentrieren.
    my @vertical = sort { $a <=> $b } map { $_->[1] } @points;
    my $vertical_offset = $height/2 - ($vertical[0]+$vertical[-1])/2;
    $_->[1] += $vertical_offset for @points;
    my @horizontal = sort { $a <=> $b } map { $_->[0] } @points;
    my $horizontal_offset = $width/2 - ($horizontal[0]+$horizontal[-1])/2;
    $_->[0] += $horizontal_offset for @points;

    my $move_x = control_target('move_x', $frame_start) <=> 0;
    my $move_y = control_target('move_y', $frame_start) <=> 0;
    my $cx = $position_x*$width + $step_x;
    my $cy = $position_y*$height + $step_y;
    my $half_w = ($horizontal[-1]-$horizontal[0])/2;
    my $half_h = ($vertical[-1]-$vertical[0])/2;
    my $limit_x = $width/2 - $half_w - 0.5;
    my $limit_y = $height/2 - $half_h - 0.5;
    $limit_x = 0 if $limit_x < 0;
    $limit_y = 0 if $limit_y < 0;
    my $at_edge = ($move_x && $move_x*($cx-$width/2) >= $limit_x-0.001)
               || ($move_y && $move_y*($cy-$height/2) >= $limit_y-0.001);
    if ($at_edge) {
        # Oben/rechts hinein, unten/links heraus. Die berührte Kante bleibt
        # beim Verkleinern angeheftet, damit der Zoom nicht durch Bewegung abreißt.
        my $zoom_direction = $move_y ? -$move_y : $move_x;
        my $next_zoom = $zoom * exp($zoom_direction*0.8*$dt);
        $next_zoom = 4 if $next_zoom > 4;
        $next_zoom = 0.2 if $next_zoom < 0.2;
        my $factor = $next_zoom/$zoom;
        $zoom = $next_zoom;
        for my $p (@points) {
            $p->[0] = $width/2 + ($p->[0]-$width/2)*$factor;
            $p->[1] = $height/2 + ($p->[1]-$height/2)*$factor;
        }
        $limit_x = $width/2 - $half_w*$factor - 0.5;
        $limit_y = $height/2 - $half_h*$factor - 0.5;
        $limit_x = 0 if $limit_x < 0;
        $limit_y = 0 if $limit_y < 0;
        $cx = $width/2 + $move_x*$limit_x if $move_x;
        $cy = $height/2 + $move_y*$limit_y if $move_y;
    }
    $cx = $width/2-$limit_x if $cx < $width/2-$limit_x;
    $cx = $width/2+$limit_x if $cx > $width/2+$limit_x;
    $cy = $height/2-$limit_y if $cy < $height/2-$limit_y;
    $cy = $height/2+$limit_y if $cy > $height/2+$limit_y;
    ($position_x, $position_y) = ($cx/$width, $cy/$height);
    for my $p (@points) {
        $p->[0] += $cx-$width/2;
        $p->[1] += $cy-$height/2;
    }
    my (@pixels, @depth, @colors, @intensity);
    for my $y (0 .. $height-1) {
        $pixels[$y] = [(' ') x $width];
        $depth[$y] = [(1e9) x $width];
        $colors[$y] = [(0) x $width];
        $intensity[$y] = [(0) x $width];
    }
    for my $f (@faces) {
        my ($pa, $pb, $pc) = @points[@$f];
        my @u = ($pb->[3]-$pa->[3], $pb->[4]-$pa->[4], $pb->[2]-$pa->[2]);
        my @v = ($pc->[3]-$pa->[3], $pc->[4]-$pa->[4], $pc->[2]-$pa->[2]);
        my @n = ($u[1]*$v[2]-$u[2]*$v[1], $u[2]*$v[0]-$u[0]*$v[2], $u[0]*$v[1]-$u[1]*$v[0]);
        my $len = sqrt($n[0]**2+$n[1]**2+$n[2]**2) || 1;
        my $light = abs(($n[0]*-0.35+$n[1]*0.65-$n[2]*0.68)/$len);
        $light = 1 if $light > 1;
        # Schmale Glanzlichter und ein zweites, schwächeres Streiflicht.
        my $rim = abs($n[0]*0.8 + $n[2]*0.6)/$len;
        my $shine = $light**18;
        my $brightness = 0.12 + 0.55*$light + 0.16*$rim + 0.35*$shine;
        $brightness = 1 if $brightness > 1;
        @n = map { $_/$len } @n;
        my $den = ($pb->[1]-$pc->[1])*($pa->[0]-$pc->[0])+($pc->[0]-$pb->[0])*($pa->[1]-$pc->[1]);
        next if abs($den) < 1e-8;
        my @xs = sort {$a <=> $b} map { $_->[0] } ($pa,$pb,$pc);
        my @ys = sort {$a <=> $b} map { $_->[1] } ($pa,$pb,$pc);
        my ($xmin,$xmax,$ymin,$ymax) = (int($xs[0]),int($xs[2])+1,int($ys[0]),int($ys[2])+1);
        $xmin = 0 if $xmin < 0; $ymin = 0 if $ymin < 0;
        $xmax = $width-1 if $xmax >= $width; $ymax = $height-1 if $ymax >= $height;
        for my $y ($ymin .. $ymax) {
            for my $x ($xmin .. $xmax) {
                my $w1 = (($pb->[1]-$pc->[1])*($x+0.5-$pc->[0])+($pc->[0]-$pb->[0])*($y+0.5-$pc->[1]))/$den;
                my $w2 = (($pc->[1]-$pa->[1])*($x+0.5-$pc->[0])+($pa->[0]-$pc->[0])*($y+0.5-$pc->[1]))/$den;
                my $w3 = 1-$w1-$w2;
                next if $w1 < 0 || $w2 < 0 || $w3 < 0;
                my $inv = $w1/(4+$pa->[2])+$w2/(4+$pb->[2])+$w3/(4+$pc->[2]);
                my $z = 1/$inv-4;
                next if $z >= $depth[$y][$x];
                $depth[$y][$x] = $z;
                # Perspektivisch korrekter Oberflächenpunkt und reflektierter
                # Blickstrahl: zwei virtuelle Softboxen als dezente Umgebung.
                my $px = ($w1*$pa->[3]/(4+$pa->[2])+$w2*$pb->[3]/(4+$pb->[2])+$w3*$pc->[3]/(4+$pc->[2]))/$inv;
                my $py = ($w1*$pa->[4]/(4+$pa->[2])+$w2*$pb->[4]/(4+$pb->[2])+$w3*$pc->[4]/(4+$pc->[2]))/$inv;
                my $vl = sqrt($px*$px+$py*$py+($z+4)**2);
                my @eye = ($px/$vl, $py/$vl, ($z+4)/$vl);
                my $dot = $eye[0]*$n[0]+$eye[1]*$n[1]+$eye[2]*$n[2];
                my @ref = map { $eye[$_] - 2*$dot*$n[$_] } 0..2;
                my $softbox = $ref[0]*-0.45+$ref[1]*0.55-$ref[2]*0.704;
                my $second = $ref[0]*0.8+$ref[1]*0.2-$ref[2]*0.5657;
                $softbox = 0 if $softbox < 0;
                $second = 0 if $second < 0;
                my $fresnel = (1-abs($dot))**5;
                # Breites Umgebungslicht plus schmale, wandernde Spiegelreflexe.
                my $sky = 0.5+0.5*$ref[1];
                # Flächengebundene Lichtfunken laufen auch bei Stillstand weiter.
                # Perspektivische Baryzentrik hält sie fest auf dem Schliff.
                my $u = ($w1/(4+$pa->[2]))/$inv;
                my $v = ($w2/(4+$pb->[2]))/$inv;
                my $phase = $frame_start*2.7 + $f->[0]*1.7 + $f->[1]*0.83;
                my $pulse = (0.5+0.5*sin($phase))**22;
                my $spark = $pulse*exp(-100*(($u-0.30)**2+($v-0.35)**2));
                my $b = ($brightness*0.53 + 0.10*$sky)**1.35
                      + 0.75*$softbox**28 + 0.22*$softbox**4
                      + 0.4*$second**16 + 0.22*$fresnel + $spark*0.9;
                $b = 1 if $b > 1;
                my @palette = ("9;19;36", "14;35;57", "20;57;78", "33;82;101",
                    "56;111;128", "84;145;159", "126;183;195", "183;222;229", "248;254;255");
                $pixels[$y][$x] = $spark > 0.72 ? '✦' : '█';
                $intensity[$y][$x] = $b;
                # Truecolor interpoliert die kühlen Farbstufen ohne harte Bänder.
                my $level = $b*8;
                my $index = int($level);
                my @low = split /;/, $palette[$index];
                my @high = split /;/, $palette[$index < 8 ? $index+1 : 8];
                my $fraction = $level-$index;
                $colors[$y][$x] = '38;2;'.join(';', map { int($low[$_]+($high[$_]-$low[$_])*$fraction) } 0..2);
            }
        }
    }
    # Nur sichtbare Schliffkanten zeichnen; verdeckte Kanten bleiben verborgen.
    for my $edge (@edges) {
        my ($p, $q) = @points[@$edge];
        my ($dx, $dy) = ($q->[0]-$p->[0], $q->[1]-$p->[1]);
        my $steps = int(2*(abs($dx)+abs($dy)))+1;
        my $char = abs($dy) < abs($dx)*0.22 ? '─'
                 : abs($dx) < abs($dy)*0.45 ? '│'
                 : $dx*$dy > 0 ? '╲' : '╱';
        for my $i (0 .. $steps) {
            my $t = $i/$steps;
            my ($px, $py) = ($p->[0]+$t*$dx, $p->[1]+$t*$dy);
            next if $px < 0 || $py < 0 || $px >= $width || $py >= $height;
            my ($x,$y) = (int($px),int($py));
            my $z = 1/((1-$t)/(4+$p->[2])+$t/(4+$q->[2]))-4;
            # Keine hinteren Kanten außerhalb der gerasterten Silhouette.
            next if $depth[$y][$x] == 1e9 || $z > $depth[$y][$x]+0.07;
            # Vorhandene helle Reflexe erhalten; Kanten zurückhaltend einfärben.
            next if $intensity[$y][$x] > 0.9;
            $pixels[$y][$x] = $char;
            # Farbiger Zellhintergrund erhält die Fläche hinter der feinen Linie.
            my $fill = $colors[$y][$x];
            $fill =~ s/^(?:38|48);2;(\d+;\d+;\d+).*/48;2;$1/;
            $colors[$y][$x] = $fill.';38;2;151;199;214';
        }
    }
    my $out = "\e[H";
    for my $y (0 .. $height-1) {
        my $last = -1;
        for my $x (0 .. $width-1) {
            my $color = $colors[$y][$x];
            if ($color ne $last) { $out .= "\e[0;${color}m"; $last = $color }
            $out .= $pixels[$y][$x];
        }
        $out .= "\e[0m\e[K\r\n" if $y < $rows-1;
    }
    if ($rows > 2) {
        my $mode = $automatic ? 'Auto 1' : $turn ? 'Drehen '.abs($turn) : abs($angular_speed) > 0 ? 'Schwung' : 'Pause';
        my $label = " W/S oder +/-: Zoom | A/D: Drehen (halten: 1-3) | Q/Esc: Ende";
        $out .= "\e[90m" . substr($label,0,$width) . "\e[0m\e[K";
        my $extra = sprintf(" Pfeile: Bewegen | Rand: oben/rechts +, unten/links - | %d%% %s", $zoom*100, $mode);
        $out .= "\r\n\e[90m".substr($extra,0,$width)."\e[0m\e[K";
    }
    print $out;
    my $rest = 1/30 - (time-$frame_start);
    sleep($rest) if $rest > 0;
}
